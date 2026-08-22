import { isPositiveQuantity } from "@/modules/inventory/domain/quantity";
import { toMajorString, type Money } from "@/modules/shared-kernel/money";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type { DomainEventType } from "@/modules/events/catalog";
import {
  downloadDocument,
  uploadDocument,
} from "@/modules/documents/application/documents";
import { DocumentNotFoundError } from "@/modules/documents/domain/errors";
import type { DocumentRepository } from "@/modules/documents/infrastructure/repositories";
import type { StorageAdapter } from "@/lib/storage/types";
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
import { buildQuotationDocumentView } from "@/modules/sales/application/quotation-document-view";
import { renderQuotationPdfBytes } from "@/modules/sales/application/quotation-pdf";
import type { BusinessProfile } from "@/modules/tenant/domain/types";
import {
  QuotationNotFoundError,
  QuotationValidationError,
} from "@/modules/sales/domain/errors";
import {
  formatQuotationNumber,
  quotationFinancialYearKey,
} from "@/modules/sales/domain/numbering";
import { lineTaxableAmount, moneyTimesQuantity } from "@/modules/sales/domain/pricing";
import {
  assertQuotationEditable,
  assertQuotationTransition,
} from "@/modules/sales/domain/status";
import { aggregateQuotationLines, zeroMoney } from "@/modules/sales/domain/totals";
import type {
  PreparedQuotation,
  PreparedQuotationLine,
  Quotation,
  QuotationInput,
  QuotationListFilter,
  QuotationStatus,
  QuotationTaxContext,
} from "@/modules/sales/domain/types";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";

export type QuotationUseCaseDeps = {
  sales: SalesRepository;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
};

export type QuotationPdfDeps = {
  tenantId: string;
  actorUserId: string;
  business: BusinessProfile;
  quotationId: string;
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
  throw new QuotationValidationError(
    "Choose a place of supply. Add the customer's state or GSTIN, or select a state on the quotation."
  );
}

async function prepareQuotation(input: {
  tenantId: string;
  fields: QuotationInput;
  taxContext: QuotationTaxContext;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
}): Promise<PreparedQuotation> {
  if (input.fields.lines.length === 0) {
    throw new QuotationValidationError("Add at least one product or service line.");
  }

  const customer = await input.parties.findCustomerById(
    input.tenantId,
    input.fields.customerId
  );
  if (!customer) {
    throw new PartyNotFoundError();
  }
  if (customer.status === "INACTIVE") {
    throw new PartyInactiveError("This customer is inactive and cannot be quoted.");
  }

  const placeOfSupplyStateCode = resolvePlaceOfSupply({
    explicit: input.fields.placeOfSupplyStateCode,
    customerGstin: customer.gstin,
    customerState: customer.state,
  });

  const currency = input.taxContext.currency;
  const lines: PreparedQuotationLine[] = [];

  for (const [index, lineInput] of input.fields.lines.entries()) {
    if (!isPositiveQuantity(lineInput.quantity)) {
      throw new QuotationValidationError("Each line quantity must be greater than zero.");
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
      throw new QuotationValidationError("Unit price cannot be negative.");
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
  const validUntil = input.fields.validUntil ?? null;
  if (validUntil && validUntil < input.fields.issuedOn) {
    throw new QuotationValidationError("Valid until cannot be before the quotation date.");
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    issuedOn: input.fields.issuedOn,
    validUntil,
    notes,
    placeOfSupplyStateCode,
    ...totals,
    lines,
  };
}

export async function previewQuotation(input: {
  tenantId: string;
  fields: QuotationInput;
  taxContext: QuotationTaxContext;
} & Pick<QuotationUseCaseDeps, "parties" | "catalog" | "taxRates" | "hsnSac">): Promise<PreparedQuotation> {
  return prepareQuotation(input);
}

export async function createQuotation(input: {
  tenantId: string;
  actorUserId: string;
  fields: QuotationInput;
  taxContext: QuotationTaxContext;
} & QuotationUseCaseDeps): Promise<Quotation> {
  const prepared = await prepareQuotation(input);
  const financialYearKey = quotationFinancialYearKey(
    prepared.issuedOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.sales.allocateNextQuotationNumber(
    input.tenantId,
    financialYearKey
  );
  const quotation = await input.sales.createQuotation({
    tenantId: input.tenantId,
    number: formatQuotationNumber(financialYearKey, sequence),
    prepared,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "quotation.created",
    resource: "quotation",
    resourceId: quotation.id,
    metadata: {
      number: quotation.number,
      customerId: quotation.customerId,
      grandTotal: moneySnapshot(quotation.grandTotal),
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "QuotationCreated",
    aggregateType: "quotation",
    aggregateId: quotation.id,
    payload: {
      number: quotation.number,
      status: quotation.status,
      customerId: quotation.customerId,
    },
  });

  return quotation;
}

export async function updateQuotation(input: {
  tenantId: string;
  actorUserId: string;
  quotationId: string;
  fields: QuotationInput;
  taxContext: QuotationTaxContext;
} & QuotationUseCaseDeps): Promise<Quotation> {
  const existing = await input.sales.findQuotationById(input.tenantId, input.quotationId);
  if (!existing) {
    throw new QuotationNotFoundError();
  }
  assertQuotationEditable(existing.status);

  const prepared = await prepareQuotation(input);
  const quotation = await input.sales.updateQuotation({
    tenantId: input.tenantId,
    quotationId: input.quotationId,
    prepared,
  });
  if (!quotation) {
    throw new QuotationNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "quotation.updated",
    resource: "quotation",
    resourceId: quotation.id,
    metadata: {
      number: quotation.number,
      grandTotal: moneySnapshot(quotation.grandTotal),
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "QuotationUpdated",
    aggregateType: "quotation",
    aggregateId: quotation.id,
    payload: { number: quotation.number, status: quotation.status },
  });

  return quotation;
}

export async function getQuotation(input: {
  tenantId: string;
  quotationId: string;
  sales: SalesRepository;
}): Promise<Quotation> {
  const quotation = await input.sales.findQuotationById(input.tenantId, input.quotationId);
  if (!quotation) {
    throw new QuotationNotFoundError();
  }
  return quotation;
}

export async function listQuotationsPage(input: {
  tenantId: string;
  query?: string;
  status?: QuotationStatus | "ALL";
  customerId?: string;
  fromDate?: QuotationListFilter["fromDate"];
  toDate?: QuotationListFilter["toDate"];
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  sales: SalesRepository;
}) {
  return input.sales.listQuotationsPage({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    customerId: input.customerId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listQuotations(input: {
  tenantId: string;
  query?: string;
  status?: QuotationStatus | "ALL";
  customerId?: string;
  sales: SalesRepository;
}): Promise<Quotation[]> {
  const filter: QuotationListFilter = {
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    customerId: input.customerId,
  };
  return input.sales.listQuotations(filter);
}

async function transitionQuotation(input: {
  tenantId: string;
  actorUserId: string;
  quotationId: string;
  status: QuotationStatus;
  action: string;
  eventType: DomainEventType;
} & Pick<QuotationUseCaseDeps, "sales" | "audit" | "outbox">): Promise<Quotation> {
  const existing = await input.sales.findQuotationById(input.tenantId, input.quotationId);
  if (!existing) {
    throw new QuotationNotFoundError();
  }
  assertQuotationTransition(existing.status, input.status);

  const quotation = await input.sales.updateQuotationStatus({
    tenantId: input.tenantId,
    quotationId: input.quotationId,
    status: input.status,
  });
  if (!quotation) {
    throw new QuotationNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: input.action,
    resource: "quotation",
    resourceId: quotation.id,
    metadata: { number: quotation.number, from: existing.status, to: quotation.status },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateType: "Quotation",
    aggregateId: quotation.id,
    payload: { number: quotation.number, status: quotation.status },
  });

  return quotation;
}

export async function sendQuotation(
  input: {
    tenantId: string;
    actorUserId: string;
    quotationId: string;
  } & Pick<QuotationUseCaseDeps, "sales" | "audit" | "outbox">
): Promise<Quotation> {
  return transitionQuotation({
    ...input,
    status: "SENT",
    action: "quotation.sent",
    eventType: "QuotationSent",
  });
}

export async function acceptQuotation(
  input: {
    tenantId: string;
    actorUserId: string;
    quotationId: string;
  } & Pick<QuotationUseCaseDeps, "sales" | "audit" | "outbox">
): Promise<Quotation> {
  return transitionQuotation({
    ...input,
    status: "ACCEPTED",
    action: "quotation.accepted",
    eventType: "QuotationAccepted",
  });
}

export async function cancelQuotation(
  input: {
    tenantId: string;
    actorUserId: string;
    quotationId: string;
  } & Pick<QuotationUseCaseDeps, "sales" | "audit" | "outbox">
): Promise<Quotation> {
  return transitionQuotation({
    ...input,
    status: "CANCELLED",
    action: "quotation.cancelled",
    eventType: "QuotationCancelled",
  });
}

export async function exportQuotationPdf(input: QuotationPdfDeps) {
  const quotation = await input.sales.findQuotationById(
    input.tenantId,
    input.quotationId
  );
  if (!quotation) {
    throw new QuotationNotFoundError();
  }
  if (quotation.status !== "SENT" && quotation.status !== "ACCEPTED") {
    throw new QuotationValidationError(
      "Send or accept the quotation before exporting a PDF."
    );
  }

  const customer = await input.parties.findCustomerById(
    input.tenantId,
    quotation.customerId
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

  const view = buildQuotationDocumentView({
    number: quotation.number,
    issuedOn: quotation.issuedOn,
    validUntil: quotation.validUntil,
    notes: quotation.notes,
    placeOfSupplyStateCode: quotation.placeOfSupplyStateCode,
    seller: input.business,
    buyer: customer,
    logoUrl: null,
    prepared: quotation,
  });
  const bytes = await renderQuotationPdfBytes(view, logo);
  return uploadDocument({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    ownerRecordType: "QUOTATION",
    ownerRecordId: quotation.id,
    filename: `${quotation.number.replace(/\//g, "-")}.pdf`,
    bytes,
    documents: input.documents,
    storage: input.storage,
    audit: input.audit,
  });
}

