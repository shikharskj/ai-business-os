import { isPositiveQuantity } from "@/modules/inventory/domain/quantity";
import {
  compareQuantity,
  quantity,
  subtractQuantity,
} from "@/modules/inventory/domain/quantity";
import { recordInventoryMovement } from "@/modules/inventory/application/stock";
import { toMajorString, money, type Money } from "@/modules/shared-kernel/money";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import { postJournal } from "@/modules/accounting/application/post-journal";
import { CatalogNotFoundError } from "@/modules/catalog/domain/errors";
import { calculateTax } from "@/modules/tax/application/calculate-tax";
import { buildPurchaseReturnJournalLines } from "@/modules/purchases/application/build-purchase-return-journal";
import type {
  PurchasePostDeps,
  PurchaseUseCaseDeps,
} from "@/modules/purchases/application/purchases";
import {
  PurchaseNotFoundError,
  PurchaseReturnAlreadyPostedError,
  PurchaseReturnNotFoundError,
  PurchaseReturnStatusError,
  PurchaseReturnValidationError,
} from "@/modules/purchases/domain/errors";
import {
  assertPurchaseReturnEditable,
  assertPurchaseReturnTransition,
  isPostedPurchaseReturnStatus,
} from "@/modules/purchases/domain/purchase-return-status";
import {
  assertPurchaseTransition,
  isPostedPurchaseStatus,
} from "@/modules/purchases/domain/status";
import {
  formatPurchaseReturnNumber,
  purchaseReturnFinancialYearKey,
} from "@/modules/purchases/domain/numbering";
import {
  lineTaxableAmount,
  moneyTimesQuantity,
  proportionMoney,
} from "@/modules/purchases/domain/pricing";
import { aggregatePurchaseLines } from "@/modules/purchases/domain/totals";
import type {
  PreparedPurchaseReturn,
  PreparedPurchaseReturnLine,
  PurchaseReturn,
  PurchaseReturnInput,
  PurchaseReturnListFilter,
  PurchaseReturnStatus,
  PurchaseTaxContext,
} from "@/modules/purchases/domain/types";
import type { PurchasesRepository } from "@/modules/purchases/infrastructure/repositories";
import type { SupplierPaymentRepository } from "@/modules/payments/infrastructure/supplier-payment-repositories";
import { nextPurchasePaymentStatus } from "@/modules/payments/domain/status";
import { remainingDocumentBalance } from "@/modules/payments/domain/allocation";

export type PurchaseReturnUseCaseDeps = PurchaseUseCaseDeps;

export type PurchaseReturnPostDeps = PurchasePostDeps & {
  supplierPayments: SupplierPaymentRepository;
};

function moneySnapshot(value: Money) {
  return { amount: toMajorString(value), currency: value.currency };
}

async function preparePurchaseReturn(input: {
  tenantId: string;
  fields: PurchaseReturnInput;
  taxContext: PurchaseTaxContext;
  purchases: PurchasesRepository;
  parties: PurchaseUseCaseDeps["parties"];
  catalog: PurchaseUseCaseDeps["catalog"];
  taxRates: PurchaseUseCaseDeps["taxRates"];
  hsnSac: PurchaseUseCaseDeps["hsnSac"];
  excludePurchaseReturnId?: string;
}): Promise<PreparedPurchaseReturn> {
  if (input.fields.lines.length === 0) {
    throw new PurchaseReturnValidationError("Add at least one line to return.");
  }

  const purchase = await input.purchases.findPurchaseById(
    input.tenantId,
    input.fields.purchaseId
  );
  if (!purchase) {
    throw new PurchaseNotFoundError();
  }
  if (!isPostedPurchaseStatus(purchase.status)) {
    throw new PurchaseReturnValidationError(
      "Purchase returns can only be issued against a posted bill."
    );
  }

  const supplier = await input.parties.findSupplierById(
    input.tenantId,
    purchase.supplierId
  );

  const returnedByLine = await input.purchases.returnedQuantityByPurchaseLine({
    tenantId: input.tenantId,
    purchaseId: purchase.id,
    excludePurchaseReturnId: input.excludePurchaseReturnId,
  });

  const seen = new Set<string>();
  const currency = input.taxContext.currency;
  const lines: PreparedPurchaseReturnLine[] = [];

  for (const [index, lineInput] of input.fields.lines.entries()) {
    if (seen.has(lineInput.purchaseLineId)) {
      throw new PurchaseReturnValidationError(
        "Each purchase line can appear only once on a return."
      );
    }
    seen.add(lineInput.purchaseLineId);

    if (!isPositiveQuantity(lineInput.quantity)) {
      throw new PurchaseReturnValidationError("Each line quantity must be greater than zero.");
    }

    const purchaseLine = purchase.lines.find((line) => line.id === lineInput.purchaseLineId);
    if (!purchaseLine) {
      throw new PurchaseReturnValidationError(
        "A return line must belong to the selected purchase bill."
      );
    }

    const alreadyReturned = returnedByLine.get(purchaseLine.id) ?? quantity(0n);
    const remaining = subtractQuantity(purchaseLine.quantity, alreadyReturned);
    if (compareQuantity(lineInput.quantity, remaining) > 0) {
      throw new PurchaseReturnValidationError(
        `Cannot return more than the remaining quantity on ${purchaseLine.productName}.`
      );
    }

    const product = await input.catalog.findProductById(
      input.tenantId,
      purchaseLine.productId
    );
    if (!product) {
      throw new CatalogNotFoundError();
    }

    const unitPrice = purchaseLine.unitPrice;
    const discount = proportionMoney(
      purchaseLine.discount,
      lineInput.quantity,
      purchaseLine.quantity
    );
    const lineSubtotal = moneyTimesQuantity(unitPrice, lineInput.quantity);
    const taxableAmount = lineTaxableAmount(lineSubtotal, discount);
    const gst = await calculateTax({
      tenantId: input.tenantId,
      businessGstin: input.taxContext.gstin,
      businessGstRegistrationStatus: input.taxContext.gstRegistrationStatus,
      businessStateName: input.taxContext.stateName,
      counterpartyGstin: supplier?.gstin ?? null,
      placeOfSupplyStateCode: purchase.placeOfSupplyStateCode,
      transactionType: "PURCHASE",
      hsnSac: purchaseLine.hsnSac,
      taxableAmount,
      taxRateBps: purchaseLine.taxRateBps,
      defaultGstRateBps: input.taxContext.defaultGstRateBps,
      transactionDate: input.fields.issuedOn,
      taxRateRepository: input.taxRates,
      hsnSacRepository: input.hsnSac,
    });

    lines.push({
      sortOrder: index,
      sourcePurchaseLineId: purchaseLine.id,
      productId: purchaseLine.productId,
      productName: purchaseLine.productName,
      sku: purchaseLine.sku,
      unitOfMeasurement: purchaseLine.unitOfMeasurement,
      hsnSac: purchaseLine.hsnSac,
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

  return {
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    purchaseId: purchase.id,
    purchaseNumber: purchase.number,
    issuedOn: input.fields.issuedOn,
    notes,
    placeOfSupplyStateCode: purchase.placeOfSupplyStateCode,
    ...totals,
    lines,
  };
}

export async function previewPurchaseReturn(input: {
  tenantId: string;
  fields: PurchaseReturnInput;
  taxContext: PurchaseTaxContext;
  excludePurchaseReturnId?: string;
} & Pick<
  PurchaseReturnUseCaseDeps,
  "purchases" | "parties" | "catalog" | "taxRates" | "hsnSac"
>): Promise<PreparedPurchaseReturn> {
  return preparePurchaseReturn(input);
}

export async function createPurchaseReturn(input: {
  tenantId: string;
  actorUserId: string;
  fields: PurchaseReturnInput;
  taxContext: PurchaseTaxContext;
} & PurchaseReturnUseCaseDeps): Promise<PurchaseReturn> {
  const prepared = await preparePurchaseReturn(input);
  const financialYearKey = purchaseReturnFinancialYearKey(
    prepared.issuedOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.purchases.allocateNextPurchaseReturnNumber(
    input.tenantId,
    financialYearKey
  );
  const purchaseReturn = await input.purchases.createPurchaseReturn({
    tenantId: input.tenantId,
    number: formatPurchaseReturnNumber(financialYearKey, sequence),
    prepared,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "purchase_return.created",
    resource: "purchase_return",
    resourceId: purchaseReturn.id,
    metadata: {
      number: purchaseReturn.number,
      purchaseId: purchaseReturn.purchaseId,
      grandTotal: moneySnapshot(purchaseReturn.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "PurchaseReturnCreated",
    aggregateType: "PurchaseReturn",
    aggregateId: purchaseReturn.id,
    payload: {
      number: purchaseReturn.number,
      status: purchaseReturn.status,
      purchaseId: purchaseReturn.purchaseId,
    },
  });

  return purchaseReturn;
}

export async function updatePurchaseReturn(input: {
  tenantId: string;
  actorUserId: string;
  purchaseReturnId: string;
  fields: PurchaseReturnInput;
  taxContext: PurchaseTaxContext;
} & PurchaseReturnUseCaseDeps): Promise<PurchaseReturn> {
  const existing = await input.purchases.findPurchaseReturnById(
    input.tenantId,
    input.purchaseReturnId
  );
  if (!existing) {
    throw new PurchaseReturnNotFoundError();
  }
  assertPurchaseReturnEditable(existing.status);

  const prepared = await preparePurchaseReturn({
    ...input,
    excludePurchaseReturnId: existing.id,
  });
  const purchaseReturn = await input.purchases.updatePurchaseReturn({
    tenantId: input.tenantId,
    purchaseReturnId: existing.id,
    prepared,
  });
  if (!purchaseReturn) {
    throw new PurchaseReturnNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "purchase_return.updated",
    resource: "purchase_return",
    resourceId: purchaseReturn.id,
    metadata: {
      number: purchaseReturn.number,
      grandTotal: moneySnapshot(purchaseReturn.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "PurchaseReturnUpdated",
    aggregateType: "PurchaseReturn",
    aggregateId: purchaseReturn.id,
    payload: { number: purchaseReturn.number, status: purchaseReturn.status },
  });

  return purchaseReturn;
}

export async function getPurchaseReturn(input: {
  tenantId: string;
  purchaseReturnId: string;
  purchases: PurchasesRepository;
}): Promise<PurchaseReturn> {
  const purchaseReturn = await input.purchases.findPurchaseReturnById(
    input.tenantId,
    input.purchaseReturnId
  );
  if (!purchaseReturn) {
    throw new PurchaseReturnNotFoundError();
  }
  return purchaseReturn;
}

export async function listPurchaseReturnsPage(input: {
  tenantId: string;
  query?: string;
  status?: PurchaseReturnStatus | "ALL";
  supplierId?: string;
  purchaseId?: string;
  fromDate?: PurchaseReturnListFilter["fromDate"];
  toDate?: PurchaseReturnListFilter["toDate"];
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  purchases: PurchasesRepository;
}) {
  return input.purchases.listPurchaseReturnsPage({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    supplierId: input.supplierId,
    purchaseId: input.purchaseId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listPurchaseReturns(input: {
  tenantId: string;
  query?: string;
  status?: PurchaseReturnStatus | "ALL";
  supplierId?: string;
  purchaseId?: string;
  statuses?: readonly PurchaseReturnStatus[];
  fromDate?: PurchaseReturnListFilter["fromDate"];
  toDate?: PurchaseReturnListFilter["toDate"];
  purchases: PurchasesRepository;
}): Promise<PurchaseReturn[]> {
  return input.purchases.listPurchaseReturns({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    supplierId: input.supplierId,
    purchaseId: input.purchaseId,
    statuses: input.statuses,
    fromDate: input.fromDate,
    toDate: input.toDate,
  });
}

export async function postPurchaseReturn(input: {
  tenantId: string;
  actorUserId: string;
  purchaseReturnId: string;
  taxContext: PurchaseTaxContext;
  closedThroughPeriodKey: string | null;
} & PurchaseReturnPostDeps): Promise<PurchaseReturn> {
  const existing = await input.purchases.findPurchaseReturnById(
    input.tenantId,
    input.purchaseReturnId
  );
  if (!existing) {
    throw new PurchaseReturnNotFoundError();
  }
  if (isPostedPurchaseReturnStatus(existing.status)) {
    throw new PurchaseReturnAlreadyPostedError();
  }
  if (existing.status !== "DRAFT") {
    throw new PurchaseReturnStatusError(
      `A ${existing.status.toLowerCase()} purchase return cannot be posted.`
    );
  }

  const purchase = await input.purchases.lockPurchaseForUpdate(
    input.tenantId,
    existing.purchaseId
  );
  if (!purchase) {
    throw new PurchaseNotFoundError();
  }
  if (!isPostedPurchaseStatus(purchase.status)) {
    throw new PurchaseReturnValidationError(
      "Purchase returns can only be posted against a posted bill."
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

  const journalLines = buildPurchaseReturnJournalLines(existing, productMap);

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
        cause: "RETURN",
        direction: "OUT",
        quantity: line.quantity,
        occurredOn: existing.issuedOn,
        sourceType: "PurchaseReturn",
        sourceId: existing.id,
        idempotencyKey: `purchase-return:${existing.id}:${line.id}`,
        reason: `Purchase return ${existing.number}`,
      },
    });
  }

  const journal = await postJournal({
    tenantId: input.tenantId,
    accountingDate: existing.issuedOn,
    financialYearStartMonth: input.taxContext.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    sourceType: "PurchaseReturn",
    sourceId: existing.id,
    memo: `Purchase return ${existing.number}`,
    lines: journalLines,
    accountRepository: input.accounts,
    journalRepository: input.journals,
  });

  const purchaseReturn = await input.purchases.markPurchaseReturnPosted({
    tenantId: input.tenantId,
    purchaseReturnId: existing.id,
    journalId: journal.id,
    postedAt: journal.postedAt,
    status: "POSTED",
    expectedStatus: "DRAFT",
  });
  if (!purchaseReturn) {
    throw new PurchaseReturnStatusError(
      "The purchase return was modified by another user. Please refresh and try again."
    );
  }

  const allocated =
    (
      await input.supplierPayments.allocatedTotalsForPurchases(input.tenantId, [
        purchase.id,
      ])
    ).get(purchase.id) ?? money(0n, purchase.grandTotal.currency);
  const returned =
    (
      await input.purchases.returnedTotalsForPurchases(input.tenantId, [purchase.id])
    ).get(purchase.id) ?? money(0n, purchase.grandTotal.currency);
  const outstanding = remainingDocumentBalance(
    purchase.grandTotal,
    allocated,
    returned
  );
  const nextStatus = nextPurchasePaymentStatus({
    currentStatus: purchase.status,
    grandTotal: purchase.grandTotal,
    outstanding,
  });
  if (nextStatus !== purchase.status) {
    assertPurchaseTransition(purchase.status, nextStatus);
    const updatedPurchase = await input.purchases.updatePurchaseStatus({
      tenantId: input.tenantId,
      purchaseId: purchase.id,
      status: nextStatus,
    });
    if (!updatedPurchase) {
      throw new PurchaseNotFoundError();
    }
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "purchase_return.posted",
    resource: "purchase_return",
    resourceId: purchaseReturn.id,
    metadata: {
      number: purchaseReturn.number,
      purchaseId: purchaseReturn.purchaseId,
      journalId: journal.id,
      grandTotal: moneySnapshot(purchaseReturn.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "PurchaseReturnPosted",
    aggregateType: "PurchaseReturn",
    aggregateId: purchaseReturn.id,
    payload: {
      number: purchaseReturn.number,
      status: purchaseReturn.status,
      purchaseId: purchaseReturn.purchaseId,
      journalId: journal.id,
    },
  });

  return purchaseReturn;
}

export async function cancelPurchaseReturn(input: {
  tenantId: string;
  actorUserId: string;
  purchaseReturnId: string;
} & Pick<PurchaseReturnUseCaseDeps, "purchases" | "audit" | "outbox">): Promise<PurchaseReturn> {
  const existing = await input.purchases.findPurchaseReturnById(
    input.tenantId,
    input.purchaseReturnId
  );
  if (!existing) {
    throw new PurchaseReturnNotFoundError();
  }
  assertPurchaseReturnTransition(existing.status, "CANCELLED");

  const purchaseReturn = await input.purchases.updatePurchaseReturnStatus({
    tenantId: input.tenantId,
    purchaseReturnId: input.purchaseReturnId,
    status: "CANCELLED",
  });
  if (!purchaseReturn) {
    throw new PurchaseReturnNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "purchase_return.cancelled",
    resource: "purchase_return",
    resourceId: purchaseReturn.id,
    metadata: { number: purchaseReturn.number, from: existing.status },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "PurchaseReturnCancelled",
    aggregateType: "PurchaseReturn",
    aggregateId: purchaseReturn.id,
    payload: { number: purchaseReturn.number, status: purchaseReturn.status },
  });

  return purchaseReturn;
}
