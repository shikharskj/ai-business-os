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
import {
  downloadDocument,
  uploadDocument,
} from "@/modules/documents/application/documents";
import { DocumentNotFoundError } from "@/modules/documents/domain/errors";
import type { DocumentRepository } from "@/modules/documents/infrastructure/repositories";
import type { StorageAdapter } from "@/lib/storage/types";
import { PartyInactiveError, PartyNotFoundError } from "@/modules/party/domain/errors";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";
import { calculateTax } from "@/modules/tax/application/calculate-tax";
import {
  gstinStateCode,
  requireGstStateCode,
  stateCodeFromName,
} from "@/modules/tax/domain/gstin";
import type { HsnSacRepository, TaxRateRepository } from "@/modules/tax/infrastructure/repositories";
import {
  buildSalesInvoiceJournalLines,
  computeInvoiceCogsLines,
} from "@/modules/sales/application/build-invoice-journal";
import { renderInvoicePdfBytes } from "@/modules/sales/application/invoice-pdf";
import { buildInvoiceDocumentView } from "@/modules/sales/application/invoice-document-view";
import type { BusinessProfile } from "@/modules/tenant/domain/types";
import {
  InvoiceAlreadyPostedError,
  InvoiceNotFoundError,
  InvoiceValidationError,
  InvoiceStatusError,
  QuotationAlreadyConvertedError,
  QuotationNotFoundError,
  QuotationStatusError,
} from "@/modules/sales/domain/errors";
import {
  assertInvoiceEditable,
  assertInvoiceTransition,
  isPostedInvoiceStatus,
} from "@/modules/sales/domain/invoice-status";
import {
  formatInvoiceNumber,
  invoiceFinancialYearKey,
} from "@/modules/sales/domain/numbering";
import { lineTaxableAmount, moneyTimesQuantity } from "@/modules/sales/domain/pricing";
import { assertQuotationTransition } from "@/modules/sales/domain/status";
import { aggregateQuotationLines, zeroMoney } from "@/modules/sales/domain/totals";
import type {
  InvoiceInput,
  InvoiceListFilter,
  PreparedInvoice,
  PreparedInvoiceLine,
  Quotation,
  SalesInvoice,
  SalesInvoiceStatus,
  SalesTaxContext,
} from "@/modules/sales/domain/types";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";

export type InvoiceUseCaseDeps = {
  sales: SalesRepository;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
};

export type InvoicePostDeps = InvoiceUseCaseDeps & {
  inventory: InventoryRepository;
  accounts: AccountRepository;
  journals: JournalRepository;
};

export type InvoicePdfDeps = {
  tenantId: string;
  actorUserId: string;
  business: BusinessProfile;
  invoiceId: string;
  sales: SalesRepository;
  parties: PartyRepository;
  documents: DocumentRepository;
  storage: StorageAdapter;
  audit: AuditRepository;
};

function moneySnapshot(value: Money) {
  return { amount: toMajorString(value), currency: value.currency };
}

function resolvePlaceOfSupply(input: {
  explicit?: string | null;
  customerGstin: string | null;
  customerState: string | null;
}): string {
  if (input.explicit?.trim()) {
    return requireGstStateCode(input.explicit.trim());
  }
  if (input.customerGstin) {
    return gstinStateCode(input.customerGstin);
  }
  if (input.customerState) {
    const fromName = stateCodeFromName(input.customerState);
    if (fromName) {
      return fromName;
    }
  }
  throw new InvoiceValidationError(
    "Choose a place of supply. Add the customer's state or GSTIN, or select a state on the invoice."
  );
}

async function prepareInvoice(input: {
  tenantId: string;
  fields: InvoiceInput;
  taxContext: SalesTaxContext;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
}): Promise<PreparedInvoice> {
  if (input.fields.lines.length === 0) {
    throw new InvoiceValidationError("Add at least one product or service line.");
  }

  const customer = await input.parties.findCustomerById(
    input.tenantId,
    input.fields.customerId
  );
  if (!customer) {
    throw new PartyNotFoundError();
  }
  if (customer.status === "INACTIVE") {
    throw new PartyInactiveError("This customer is inactive and cannot be invoiced.");
  }

  const placeOfSupplyStateCode = resolvePlaceOfSupply({
    explicit: input.fields.placeOfSupplyStateCode,
    customerGstin: customer.gstin,
    customerState: customer.state,
  });

  const currency = input.taxContext.currency;
  const lines: PreparedInvoiceLine[] = [];

  for (const [index, lineInput] of input.fields.lines.entries()) {
    if (!isPositiveQuantity(lineInput.quantity)) {
      throw new InvoiceValidationError("Each line quantity must be greater than zero.");
    }

    const product = await input.catalog.findProductById(
      input.tenantId,
      lineInput.productId
    );
    if (!product) {
      throw new CatalogNotFoundError();
    }

    const unitPrice = lineInput.unitPrice ?? product.sellingPrice;
    if (unitPrice.amountMinor < 0n) {
      throw new InvoiceValidationError("Unit price cannot be negative.");
    }

    const discount = lineInput.discount ?? zeroMoney(currency);
    const lineSubtotal = moneyTimesQuantity(unitPrice, lineInput.quantity);
    const taxableAmount = lineTaxableAmount(lineSubtotal, discount);
    const gst = await calculateTax({
      tenantId: input.tenantId,
      businessGstin: input.taxContext.gstin,
      businessGstRegistrationStatus: input.taxContext.gstRegistrationStatus,
      businessStateName: input.taxContext.stateName,
      counterpartyGstin: customer.gstin,
      placeOfSupplyStateCode,
      transactionType: "SALE",
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

  const totals = aggregateQuotationLines(lines, currency);
  const notes = input.fields.notes?.trim() ? input.fields.notes.trim() : null;
  const dueOn = input.fields.dueOn ?? null;
  if (dueOn && dueOn < input.fields.issuedOn) {
    throw new InvoiceValidationError("Due date cannot be before the invoice date.");
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    issuedOn: input.fields.issuedOn,
    dueOn,
    notes,
    placeOfSupplyStateCode,
    ...totals,
    lines,
  };
}

function preparedFromQuotation(quotation: Quotation): PreparedInvoice {
  return {
    customerId: quotation.customerId,
    customerName: quotation.customerName,
    issuedOn: quotation.issuedOn,
    dueOn: quotation.validUntil,
    notes: quotation.notes,
    placeOfSupplyStateCode: quotation.placeOfSupplyStateCode,
    subtotal: quotation.subtotal,
    discountTotal: quotation.discountTotal,
    taxableAmount: quotation.taxableAmount,
    cgst: quotation.cgst,
    sgst: quotation.sgst,
    igst: quotation.igst,
    totalTax: quotation.totalTax,
    grandTotal: quotation.grandTotal,
    supplyType: quotation.supplyType,
    lines: quotation.lines.map((line) => ({
      sortOrder: line.sortOrder,
      productId: line.productId,
      productName: line.productName,
      sku: line.sku,
      unitOfMeasurement: line.unitOfMeasurement,
      hsnSac: line.hsnSac,
      taxRateBps: line.taxRateBps,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      lineSubtotal: line.lineSubtotal,
      taxableAmount: line.taxableAmount,
      cgst: line.cgst,
      sgst: line.sgst,
      igst: line.igst,
      totalTax: line.totalTax,
      lineTotal: line.lineTotal,
      supplyType: line.supplyType,
      treatment: line.treatment,
    })),
  };
}

export async function previewInvoice(input: {
  tenantId: string;
  fields: InvoiceInput;
  taxContext: SalesTaxContext;
} & Pick<InvoiceUseCaseDeps, "parties" | "catalog" | "taxRates" | "hsnSac">): Promise<PreparedInvoice> {
  return prepareInvoice(input);
}

export async function createInvoice(input: {
  tenantId: string;
  actorUserId: string;
  fields: InvoiceInput;
  taxContext: SalesTaxContext;
  quotationId?: string | null;
} & InvoiceUseCaseDeps): Promise<SalesInvoice> {
  const prepared = await prepareInvoice(input);
  const financialYearKey = invoiceFinancialYearKey(
    prepared.issuedOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.sales.allocateNextInvoiceNumber(
    input.tenantId,
    financialYearKey
  );
  const invoice = await input.sales.createInvoice({
    tenantId: input.tenantId,
    number: formatInvoiceNumber(financialYearKey, sequence),
    prepared,
    quotationId: input.quotationId ?? null,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invoice.created",
    resource: "invoice",
    resourceId: invoice.id,
    metadata: {
      number: invoice.number,
      customerId: invoice.customerId,
      grandTotal: moneySnapshot(invoice.grandTotal),
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "SalesInvoiceCreated",
    aggregateType: "SalesInvoice",
    aggregateId: invoice.id,
    payload: {
      number: invoice.number,
      status: invoice.status,
      customerId: invoice.customerId,
    },
  });

  return invoice;
}

export async function updateInvoice(input: {
  tenantId: string;
  actorUserId: string;
  invoiceId: string;
  fields: InvoiceInput;
  taxContext: SalesTaxContext;
} & InvoiceUseCaseDeps): Promise<SalesInvoice> {
  const existing = await input.sales.findInvoiceById(input.tenantId, input.invoiceId);
  if (!existing) {
    throw new InvoiceNotFoundError();
  }
  assertInvoiceEditable(existing.status);

  const prepared = await prepareInvoice(input);
  const invoice = await input.sales.updateInvoice({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    prepared,
  });
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invoice.updated",
    resource: "invoice",
    resourceId: invoice.id,
    metadata: {
      number: invoice.number,
      grandTotal: moneySnapshot(invoice.grandTotal),
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "SalesInvoiceUpdated",
    aggregateType: "SalesInvoice",
    aggregateId: invoice.id,
    payload: { number: invoice.number, status: invoice.status },
  });

  return invoice;
}

export async function getInvoice(input: {
  tenantId: string;
  invoiceId: string;
  sales: SalesRepository;
}): Promise<SalesInvoice> {
  const invoice = await input.sales.findInvoiceById(input.tenantId, input.invoiceId);
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }
  return invoice;
}

export async function listInvoicesPage(input: {
  tenantId: string;
  query?: string;
  status?: SalesInvoiceStatus | "ALL";
  customerId?: string;
  due?: InvoiceListFilter["due"];
  overdueAsOf?: InvoiceListFilter["overdueAsOf"];
  fromDate?: InvoiceListFilter["fromDate"];
  toDate?: InvoiceListFilter["toDate"];
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  sales: SalesRepository;
}) {
  return input.sales.listInvoicesPage({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    customerId: input.customerId,
    due: input.due,
    overdueAsOf: input.overdueAsOf,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listInvoices(input: {
  tenantId: string;
  query?: string;
  status?: SalesInvoiceStatus | "ALL";
  customerId?: string;
  customerIds?: readonly string[];
  statuses?: readonly SalesInvoiceStatus[];
  due?: InvoiceListFilter["due"];
  overdueAsOf?: InvoiceListFilter["overdueAsOf"];
  sales: SalesRepository;
}): Promise<SalesInvoice[]> {
  const filter: InvoiceListFilter = {
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    customerId: input.customerId,
    customerIds: input.customerIds,
    statuses: input.statuses,
    due: input.due,
    overdueAsOf: input.overdueAsOf,
  };
  return input.sales.listInvoices(filter);
}

export async function postInvoice(input: {
  tenantId: string;
  actorUserId: string;
  invoiceId: string;
  taxContext: SalesTaxContext;
  closedThroughPeriodKey: string | null;
} & InvoicePostDeps): Promise<SalesInvoice> {
  const existing = await input.sales.findInvoiceById(input.tenantId, input.invoiceId);
  if (!existing) {
    throw new InvoiceNotFoundError();
  }
  if (isPostedInvoiceStatus(existing.status)) {
    throw new InvoiceAlreadyPostedError();
  }
  if (existing.status !== "DRAFT") {
    throw new InvoiceStatusError(
      `A ${existing.status.toLowerCase()} invoice cannot be posted.`
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

  const cogsLines = computeInvoiceCogsLines(existing, productMap);
  const journalLines = buildSalesInvoiceJournalLines(existing, cogsLines);

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
        cause: "SALE",
        direction: "OUT",
        quantity: line.quantity,
        occurredOn: existing.issuedOn,
        sourceType: "SalesInvoice",
        sourceId: existing.id,
        idempotencyKey: `sale:${existing.id}:${line.id}`,
        reason: `Invoice ${existing.number}`,
      },
    });
  }

  const journal = await postJournal({
    tenantId: input.tenantId,
    accountingDate: existing.issuedOn,
    financialYearStartMonth: input.taxContext.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    sourceType: "SalesInvoice",
    sourceId: existing.id,
    memo: `Invoice ${existing.number}`,
    lines: journalLines,
    accountRepository: input.accounts,
    journalRepository: input.journals,
  });

  const invoice = await input.sales.markInvoicePosted({
    tenantId: input.tenantId,
    invoiceId: existing.id,
    journalId: journal.id,
    postedAt: journal.postedAt,
    status: "POSTED",
  });
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invoice.posted",
    resource: "invoice",
    resourceId: invoice.id,
    metadata: {
      number: invoice.number,
      journalId: journal.id,
      grandTotal: moneySnapshot(invoice.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "SalesInvoicePosted",
    aggregateType: "SalesInvoice",
    aggregateId: invoice.id,
    payload: {
      number: invoice.number,
      status: invoice.status,
      journalId: journal.id,
    },
  });

  return invoice;
}

export async function cancelInvoice(input: {
  tenantId: string;
  actorUserId: string;
  invoiceId: string;
} & Pick<InvoiceUseCaseDeps, "sales" | "audit" | "outbox">): Promise<SalesInvoice> {
  const existing = await input.sales.findInvoiceById(input.tenantId, input.invoiceId);
  if (!existing) {
    throw new InvoiceNotFoundError();
  }
  assertInvoiceTransition(existing.status, "CANCELLED");

  const invoice = await input.sales.updateInvoiceStatus({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    status: "CANCELLED",
  });
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invoice.cancelled",
    resource: "invoice",
    resourceId: invoice.id,
    metadata: { number: invoice.number, from: existing.status },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "SalesInvoiceCancelled",
    aggregateType: "SalesInvoice",
    aggregateId: invoice.id,
    payload: { number: invoice.number, status: invoice.status },
  });

  return invoice;
}

export async function convertQuotationToInvoice(input: {
  tenantId: string;
  actorUserId: string;
  quotationId: string;
  taxContext: SalesTaxContext;
} & InvoiceUseCaseDeps): Promise<SalesInvoice> {
  const quotation = await input.sales.findQuotationById(input.tenantId, input.quotationId);
  if (!quotation) {
    throw new QuotationNotFoundError();
  }
  if (quotation.status === "CONVERTED") {
    throw new QuotationAlreadyConvertedError();
  }
  if (quotation.status !== "ACCEPTED") {
    throw new QuotationStatusError(
      "Only accepted quotations can be converted to an invoice."
    );
  }

  const existingInvoice = await input.sales.findInvoiceByQuotationId(
    input.tenantId,
    input.quotationId
  );
  if (existingInvoice) {
    throw new QuotationAlreadyConvertedError();
  }

  const prepared = preparedFromQuotation(quotation);
  const financialYearKey = invoiceFinancialYearKey(
    prepared.issuedOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.sales.allocateNextInvoiceNumber(
    input.tenantId,
    financialYearKey
  );
  const invoice = await input.sales.createInvoice({
    tenantId: input.tenantId,
    number: formatInvoiceNumber(financialYearKey, sequence),
    prepared,
    quotationId: quotation.id,
  });

  assertQuotationTransition(quotation.status, "CONVERTED");
  await input.sales.updateQuotationStatus({
    tenantId: input.tenantId,
    quotationId: quotation.id,
    status: "CONVERTED",
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "quotation.converted",
    resource: "quotation",
    resourceId: quotation.id,
    metadata: { number: quotation.number, invoiceId: invoice.id, invoiceNumber: invoice.number },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "QuotationConverted",
    aggregateType: "quotation",
    aggregateId: quotation.id,
    payload: { number: quotation.number, invoiceId: invoice.id },
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "invoice.created",
    resource: "invoice",
    resourceId: invoice.id,
    metadata: {
      number: invoice.number,
      quotationId: quotation.id,
      grandTotal: moneySnapshot(invoice.grandTotal),
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "SalesInvoiceCreated",
    aggregateType: "SalesInvoice",
    aggregateId: invoice.id,
    payload: {
      number: invoice.number,
      status: invoice.status,
      quotationId: quotation.id,
    },
  });

  return invoice;
}

export async function exportInvoicePdf(input: InvoicePdfDeps) {
  const invoice = await input.sales.findInvoiceById(
    input.tenantId,
    input.invoiceId
  );
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }
  if (invoice.status === "DRAFT") {
    throw new InvoiceValidationError("Post the invoice before exporting a PDF.");
  }

  const customer = await input.parties.findCustomerById(
    input.tenantId,
    invoice.customerId
  );

  let logo: { bytes: Uint8Array; contentType: string } | null = null;
  if (input.business.logoDocumentId) {
    try {
      const downloaded = await downloadDocument({
        tenantId: input.tenantId,
        documentId: input.business.logoDocumentId,
        documents: input.documents,
        storage: input.storage,
      });
      logo = {
        bytes: downloaded.body,
        contentType: downloaded.record.contentType,
      };
    } catch (error) {
      if (!(error instanceof DocumentNotFoundError)) {
        throw error;
      }
    }
  }

  const view = buildInvoiceDocumentView({
    number: invoice.number,
    issuedOn: invoice.issuedOn,
    dueOn: invoice.dueOn,
    notes: invoice.notes,
    placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
    seller: input.business,
    buyer: customer,
    logoUrl: null,
    prepared: invoice,
  });
  const bytes = await renderInvoicePdfBytes(view, logo);
  return uploadDocument({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    ownerRecordType: "INVOICE",
    ownerRecordId: invoice.id,
    filename: `${invoice.number.replace(/\//g, "-")}.pdf`,
    bytes,
    documents: input.documents,
    storage: input.storage,
    audit: input.audit,
  });
}
