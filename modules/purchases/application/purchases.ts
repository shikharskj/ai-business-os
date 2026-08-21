import { isPositiveQuantity } from "@/modules/inventory/domain/quantity";
import { recordInventoryMovement } from "@/modules/inventory/application/stock";
import type { InventoryRepository } from "@/modules/inventory/infrastructure/repositories";
import { toMajorString, type Money } from "@/modules/shared-kernel/money";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import { postJournal } from "@/modules/accounting/application/post-journal";
import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import { CatalogNotFoundError } from "@/modules/catalog/domain/errors";
import type { CatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import { PartyInactiveError, PartyNotFoundError } from "@/modules/party/domain/errors";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";
import { calculateTax } from "@/modules/tax/application/calculate-tax";
import {
  gstinStateCode,
  requireGstStateCode,
  stateCodeFromName,
} from "@/modules/tax/domain/gstin";
import type { HsnSacRepository, TaxRateRepository } from "@/modules/tax/infrastructure/repositories";
import { buildPurchaseJournalLines } from "@/modules/purchases/application/build-purchase-journal";
import {
  PurchaseAlreadyPostedError,
  PurchaseNotFoundError,
  PurchaseStatusError,
  PurchaseValidationError,
} from "@/modules/purchases/domain/errors";
import {
  assertPurchaseEditable,
  assertPurchaseTransition,
  isPostedPurchaseStatus,
} from "@/modules/purchases/domain/status";
import {
  formatPurchaseNumber,
  purchaseFinancialYearKey,
} from "@/modules/purchases/domain/numbering";
import { lineTaxableAmount, moneyTimesQuantity } from "@/modules/purchases/domain/pricing";
import { aggregatePurchaseLines, zeroMoney } from "@/modules/purchases/domain/totals";
import type {
  PreparedPurchase,
  PreparedPurchaseLine,
  Purchase,
  PurchaseInput,
  PurchaseListFilter,
  PurchaseStatus,
  PurchaseTaxContext,
} from "@/modules/purchases/domain/types";
import type { PurchasesRepository } from "@/modules/purchases/infrastructure/repositories";

export type PurchaseUseCaseDeps = {
  purchases: PurchasesRepository;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
};

export type PurchasePostDeps = PurchaseUseCaseDeps & {
  inventory: InventoryRepository;
  accounts: AccountRepository;
  journals: JournalRepository;
};

function moneySnapshot(value: Money) {
  return { amount: toMajorString(value), currency: value.currency };
}

function resolvePlaceOfSupply(input: {
  explicit?: string | null;
  supplierGstin: string | null;
  supplierState: string | null;
}): string {
  if (input.explicit?.trim()) {
    return requireGstStateCode(input.explicit.trim());
  }
  if (input.supplierGstin) {
    return gstinStateCode(input.supplierGstin);
  }
  if (input.supplierState) {
    const fromName = stateCodeFromName(input.supplierState);
    if (fromName) {
      return fromName;
    }
  }
  throw new PurchaseValidationError(
    "Choose a place of supply. Add the supplier's state or GSTIN, or select a state on the bill."
  );
}

async function preparePurchase(input: {
  tenantId: string;
  fields: PurchaseInput;
  taxContext: PurchaseTaxContext;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
}): Promise<PreparedPurchase> {
  if (input.fields.lines.length === 0) {
    throw new PurchaseValidationError("Add at least one product or service line.");
  }

  const supplier = await input.parties.findSupplierById(
    input.tenantId,
    input.fields.supplierId
  );
  if (!supplier) {
    throw new PartyNotFoundError();
  }
  if (supplier.status === "INACTIVE") {
    throw new PartyInactiveError("This supplier is inactive and cannot be billed.");
  }

  const placeOfSupplyStateCode = resolvePlaceOfSupply({
    explicit: input.fields.placeOfSupplyStateCode,
    supplierGstin: supplier.gstin,
    supplierState: supplier.state,
  });

  const currency = input.taxContext.currency;
  const lines: PreparedPurchaseLine[] = [];

  for (const [index, lineInput] of input.fields.lines.entries()) {
    if (!isPositiveQuantity(lineInput.quantity)) {
      throw new PurchaseValidationError("Each line quantity must be greater than zero.");
    }

    const product = await input.catalog.findProductById(
      input.tenantId,
      lineInput.productId
    );
    if (!product) {
      throw new CatalogNotFoundError();
    }

    const unitPrice = lineInput.unitPrice ?? product.purchasePrice;
    if (unitPrice.amountMinor < 0n) {
      throw new PurchaseValidationError("Unit price cannot be negative.");
    }

    const discount = lineInput.discount ?? zeroMoney(currency);
    const lineSubtotal = moneyTimesQuantity(unitPrice, lineInput.quantity);
    const taxableAmount = lineTaxableAmount(lineSubtotal, discount);
    const gst = await calculateTax({
      tenantId: input.tenantId,
      businessGstin: input.taxContext.gstin,
      businessGstRegistrationStatus: input.taxContext.gstRegistrationStatus,
      businessStateName: input.taxContext.stateName,
      counterpartyGstin: supplier.gstin,
      placeOfSupplyStateCode,
      transactionType: "PURCHASE",
      hsnSac: product.hsnSac,
      taxableAmount,
      taxRateBps: product.taxRateBps,
      defaultGstRateBps: input.taxContext.defaultGstRateBps,
      transactionDate: input.fields.issuedOn,
      taxRateRepository: input.taxRates,
      hsnSacRepository: input.hsnSac,
    });

    lines.push({
      sortOrder: index,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitOfMeasurement: product.unitOfMeasurement,
      hsnSac: product.hsnSac,
      taxRateBps: gst.taxRateBps,
      quantity: lineInput.quantity,
      unitPrice,
      discount,
      lineSubtotal,
      taxableAmount,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      totalTax: gst.totalTax,
      lineTotal: gst.grandTotal,
      supplyType: gst.supplyType,
      treatment: gst.treatment,
    });
  }

  const totals = aggregatePurchaseLines(lines, currency);
  const notes = input.fields.notes?.trim() ? input.fields.notes.trim() : null;
  const dueOn = input.fields.dueOn ?? null;
  if (dueOn && dueOn < input.fields.issuedOn) {
    throw new PurchaseValidationError("Due date cannot be before the bill date.");
  }

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    issuedOn: input.fields.issuedOn,
    dueOn,
    notes,
    placeOfSupplyStateCode,
    ...totals,
    lines,
  };
}

export async function previewPurchase(input: {
  tenantId: string;
  fields: PurchaseInput;
  taxContext: PurchaseTaxContext;
} & Pick<PurchaseUseCaseDeps, "parties" | "catalog" | "taxRates" | "hsnSac">): Promise<PreparedPurchase> {
  return preparePurchase(input);
}

export async function createPurchase(input: {
  tenantId: string;
  actorUserId: string;
  fields: PurchaseInput;
  taxContext: PurchaseTaxContext;
} & PurchaseUseCaseDeps): Promise<Purchase> {
  const prepared = await preparePurchase(input);
  const financialYearKey = purchaseFinancialYearKey(
    prepared.issuedOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.purchases.allocateNextPurchaseNumber(
    input.tenantId,
    financialYearKey
  );
  const purchase = await input.purchases.createPurchase({
    tenantId: input.tenantId,
    number: formatPurchaseNumber(financialYearKey, sequence),
    prepared,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "purchase.created",
    resource: "purchase",
    resourceId: purchase.id,
    metadata: {
      number: purchase.number,
      supplierId: purchase.supplierId,
      grandTotal: moneySnapshot(purchase.grandTotal),
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "PurchaseCreated",
    aggregateType: "Purchase",
    aggregateId: purchase.id,
    payload: {
      number: purchase.number,
      status: purchase.status,
      supplierId: purchase.supplierId,
    },
  });

  return purchase;
}

export async function updatePurchase(input: {
  tenantId: string;
  actorUserId: string;
  purchaseId: string;
  fields: PurchaseInput;
  taxContext: PurchaseTaxContext;
} & PurchaseUseCaseDeps): Promise<Purchase> {
  const existing = await input.purchases.findPurchaseById(input.tenantId, input.purchaseId);
  if (!existing) {
    throw new PurchaseNotFoundError();
  }
  assertPurchaseEditable(existing.status);

  const prepared = await preparePurchase(input);
  const purchase = await input.purchases.updatePurchase({
    tenantId: input.tenantId,
    purchaseId: input.purchaseId,
    prepared,
    expectedStatus: existing.status,
  });
  if (!purchase) {
    throw new PurchaseStatusError(
      "Purchase was modified by another operation. Please refresh and try again."
    );
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "purchase.updated",
    resource: "purchase",
    resourceId: purchase.id,
    metadata: {
      number: purchase.number,
      grandTotal: moneySnapshot(purchase.grandTotal),
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "PurchaseUpdated",
    aggregateType: "Purchase",
    aggregateId: purchase.id,
    payload: { number: purchase.number, status: purchase.status },
  });

  return purchase;
}

export async function getPurchase(input: {
  tenantId: string;
  purchaseId: string;
  purchases: PurchasesRepository;
}): Promise<Purchase> {
  const purchase = await input.purchases.findPurchaseById(input.tenantId, input.purchaseId);
  if (!purchase) {
    throw new PurchaseNotFoundError();
  }
  return purchase;
}

export async function listPurchasesPage(input: {
  tenantId: string;
  query?: string;
  status?: PurchaseStatus | "ALL";
  fromDate?: PurchaseListFilter["fromDate"];
  toDate?: PurchaseListFilter["toDate"];
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  purchases: PurchasesRepository;
}) {
  return input.purchases.listPurchasesPage({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listPurchases(input: {
  tenantId: string;
  query?: string;
  status?: PurchaseStatus | "ALL";
  supplierId?: string;
  purchases: PurchasesRepository;
}): Promise<Purchase[]> {
  const filter: PurchaseListFilter = {
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    supplierId: input.supplierId,
  };
  return input.purchases.listPurchases(filter);
}

export async function postPurchase(input: {
  tenantId: string;
  actorUserId: string;
  purchaseId: string;
  taxContext: PurchaseTaxContext;
  closedThroughPeriodKey: string | null;
} & PurchasePostDeps): Promise<Purchase> {
  const existing = await input.purchases.findPurchaseById(input.tenantId, input.purchaseId);
  if (!existing) {
    throw new PurchaseNotFoundError();
  }
  if (isPostedPurchaseStatus(existing.status)) {
    throw new PurchaseAlreadyPostedError();
  }
  if (existing.status !== "DRAFT") {
    throw new PurchaseStatusError(
      `A ${existing.status.toLowerCase()} purchase bill cannot be posted.`
    );
  }

  await ensureChartOfAccounts({
    tenantId: input.tenantId,
    accountRepository: input.accounts,
  });

  const productMap = new Map(
    (
      await Promise.all(
        existing.lines.map((line) =>
          input.catalog.findProductById(input.tenantId, line.productId)
        )
      )
    )
      .filter((product): product is NonNullable<typeof product> => product !== null)
      .map((product) => [product.id, product] as const)
  );

  for (const line of existing.lines) {
    if (!productMap.has(line.productId)) {
      throw new CatalogNotFoundError();
    }
  }

  const journalLines = buildPurchaseJournalLines(existing, productMap);

  const journal = await postJournal({
    tenantId: input.tenantId,
    accountingDate: existing.issuedOn,
    financialYearStartMonth: input.taxContext.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    sourceType: "Purchase",
    sourceId: existing.id,
    memo: `Purchase ${existing.number}`,
    lines: journalLines,
    accountRepository: input.accounts,
    journalRepository: input.journals,
  });

  for (const line of existing.lines) {
    const product = productMap.get(line.productId)!;
    if (!product.tracksInventory) {
      continue;
    }
    await recordInventoryMovement({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      catalog: input.catalog,
      inventory: input.inventory,
      audit: input.audit,
      outbox: input.outbox,
      movement: {
        productId: line.productId,
        cause: "PURCHASE",
        direction: "IN",
        quantity: line.quantity,
        occurredOn: existing.issuedOn,
        sourceType: "Purchase",
        sourceId: existing.id,
        idempotencyKey: `purchase:${existing.id}:${line.id}`,
        reason: `Purchase ${existing.number}`,
      },
    });
  }

  const purchase = await input.purchases.markPurchasePosted({
    tenantId: input.tenantId,
    purchaseId: existing.id,
    journalId: journal.id,
    postedAt: journal.postedAt,
    status: "POSTED",
    expectedStatus: "DRAFT",
  });
  if (!purchase) {
    throw new PurchaseStatusError(
      "Purchase was modified or posted by another operation. Please refresh and try again."
    );
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "purchase.posted",
    resource: "purchase",
    resourceId: purchase.id,
    metadata: {
      number: purchase.number,
      journalId: journal.id,
      grandTotal: moneySnapshot(purchase.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "PurchasePosted",
    aggregateType: "Purchase",
    aggregateId: purchase.id,
    payload: {
      number: purchase.number,
      status: purchase.status,
      journalId: journal.id,
    },
  });

  return purchase;
}

export async function cancelPurchase(input: {
  tenantId: string;
  actorUserId: string;
  purchaseId: string;
} & Pick<PurchaseUseCaseDeps, "purchases" | "audit" | "outbox">): Promise<Purchase> {
  const existing = await input.purchases.findPurchaseById(input.tenantId, input.purchaseId);
  if (!existing) {
    throw new PurchaseNotFoundError();
  }
  assertPurchaseTransition(existing.status, "CANCELLED");

  const purchase = await input.purchases.updatePurchaseStatus({
    tenantId: input.tenantId,
    purchaseId: input.purchaseId,
    status: "CANCELLED",
  });
  if (!purchase) {
    throw new PurchaseNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "purchase.cancelled",
    resource: "purchase",
    resourceId: purchase.id,
    metadata: { number: purchase.number, from: existing.status },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "PurchaseCancelled",
    aggregateType: "Purchase",
    aggregateId: purchase.id,
    payload: { number: purchase.number, status: purchase.status },
  });

  return purchase;
}
