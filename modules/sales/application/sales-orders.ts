import { isPositiveQuantity } from "@/modules/inventory/domain/quantity";
import { toMajorString, type Money } from "@/modules/shared-kernel/money";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type { DomainEventType } from "@/modules/events/catalog";
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
import {
  QuotationAlreadyConvertedError,
  QuotationNotFoundError,
  QuotationStatusError,
  SalesOrderNotFoundError,
  SalesOrderValidationError,
} from "@/modules/sales/domain/errors";
import {
  formatSalesOrderNumber,
  salesOrderFinancialYearKey,
} from "@/modules/sales/domain/numbering";
import { lineTaxableAmount, moneyTimesQuantity } from "@/modules/sales/domain/pricing";
import { assertQuotationTransition } from "@/modules/sales/domain/status";
import {
  assertSalesOrderEditable,
  assertSalesOrderTransition,
} from "@/modules/sales/domain/sales-order-status";
import { aggregateQuotationLines, zeroMoney } from "@/modules/sales/domain/totals";
import type {
  PreparedSalesOrder,
  PreparedSalesOrderLine,
  Quotation,
  QuotationTaxContext,
  SalesOrder,
  SalesOrderInput,
  SalesOrderListFilter,
  SalesOrderStatus,
} from "@/modules/sales/domain/types";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";

export type SalesOrderUseCaseDeps = {
  sales: SalesRepository;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
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
  throw new SalesOrderValidationError(
    "Choose a place of supply. Add the customer's state or GSTIN, or select a state on the order."
  );
}

async function prepareSalesOrder(input: {
  tenantId: string;
  fields: SalesOrderInput;
  taxContext: QuotationTaxContext;
  quotationId?: string | null;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
}): Promise<PreparedSalesOrder> {
  if (input.fields.lines.length === 0) {
    throw new SalesOrderValidationError("Add at least one product or service line.");
  }

  const customer = await input.parties.findCustomerById(
    input.tenantId,
    input.fields.customerId
  );
  if (!customer) {
    throw new PartyNotFoundError();
  }
  if (customer.status === "INACTIVE") {
    throw new PartyInactiveError("This customer is inactive and cannot be used on sales orders.");
  }

  const currency = input.taxContext.currency;
  const placeOfSupplyStateCode = resolvePlaceOfSupply({
    explicit: input.fields.placeOfSupplyStateCode,
    customerGstin: customer.gstin,
    customerState: customer.state,
  });

  const lines: PreparedSalesOrderLine[] = [];
  for (const [index, line] of input.fields.lines.entries()) {
    if (!isPositiveQuantity(line.quantity)) {
      throw new SalesOrderValidationError("Each line quantity must be greater than zero.");
    }
    const product = await input.catalog.findProductById(input.tenantId, line.productId);
    if (!product) {
      throw new CatalogNotFoundError();
    }
    const unitPrice = line.unitPrice ?? product.sellingPrice;
    const discount = line.discount ?? zeroMoney(currency);
    const lineSubtotal = moneyTimesQuantity(unitPrice, line.quantity);
    const taxable = lineTaxableAmount(lineSubtotal, discount);
    const tax = await calculateTax({
      tenantId: input.tenantId,
      businessGstin: input.taxContext.gstin,
      businessGstRegistrationStatus: input.taxContext.gstRegistrationStatus,
      businessStateName: input.taxContext.stateName,
      counterpartyGstin: customer.gstin,
      placeOfSupplyStateCode,
      transactionType: "SALE",
      hsnSac: product.hsnSac,
      taxableAmount: taxable,
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
      taxRateBps: tax.taxRateBps,
      quantity: line.quantity,
      unitPrice,
      discount,
      lineSubtotal,
      taxableAmount: taxable,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
      totalTax: tax.totalTax,
      lineTotal: tax.grandTotal,
      supplyType: tax.supplyType,
      treatment: tax.treatment,
    });
  }

  const expectedOn = input.fields.expectedOn ?? null;
  if (expectedOn && expectedOn < input.fields.issuedOn) {
    throw new SalesOrderValidationError("Expected date cannot be before the order date.");
  }

  const totals = aggregateQuotationLines(lines, currency);
  const notes = input.fields.notes?.trim() ? input.fields.notes.trim() : null;

  return {
    customerId: customer.id,
    customerName: customer.name,
    quotationId: input.quotationId ?? null,
    issuedOn: input.fields.issuedOn,
    expectedOn,
    notes,
    placeOfSupplyStateCode,
    ...totals,
    lines,
  };
}

function preparedFromQuotation(quotation: Quotation): PreparedSalesOrder {
  return {
    customerId: quotation.customerId,
    customerName: quotation.customerName,
    quotationId: quotation.id,
    issuedOn: quotation.issuedOn,
    expectedOn: quotation.validUntil,
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

export async function previewSalesOrder(input: {
  tenantId: string;
  fields: SalesOrderInput;
  taxContext: QuotationTaxContext;
} & Pick<SalesOrderUseCaseDeps, "parties" | "catalog" | "taxRates" | "hsnSac">): Promise<PreparedSalesOrder> {
  return prepareSalesOrder(input);
}

export async function createSalesOrder(input: {
  tenantId: string;
  actorUserId: string;
  fields: SalesOrderInput;
  taxContext: QuotationTaxContext;
} & SalesOrderUseCaseDeps): Promise<SalesOrder> {
  const prepared = await prepareSalesOrder(input);
  const financialYearKey = salesOrderFinancialYearKey(
    prepared.issuedOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.sales.allocateNextSalesOrderNumber(
    input.tenantId,
    financialYearKey
  );
  const salesOrder = await input.sales.createSalesOrder({
    tenantId: input.tenantId,
    number: formatSalesOrderNumber(financialYearKey, sequence),
    prepared,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "sales_order.created",
    resource: "sales_order",
    resourceId: salesOrder.id,
    metadata: {
      number: salesOrder.number,
      customerId: salesOrder.customerId,
      grandTotal: moneySnapshot(salesOrder.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "SalesOrderCreated",
    aggregateType: "SalesOrder",
    aggregateId: salesOrder.id,
    payload: {
      number: salesOrder.number,
      status: salesOrder.status,
      customerId: salesOrder.customerId,
    },
  });

  return salesOrder;
}

export async function updateSalesOrder(input: {
  tenantId: string;
  actorUserId: string;
  salesOrderId: string;
  fields: SalesOrderInput;
  taxContext: QuotationTaxContext;
} & SalesOrderUseCaseDeps): Promise<SalesOrder> {
  const existing = await input.sales.findSalesOrderById(input.tenantId, input.salesOrderId);
  if (!existing) {
    throw new SalesOrderNotFoundError();
  }
  assertSalesOrderEditable(existing.status);

  const prepared = await prepareSalesOrder({
    ...input,
    quotationId: existing.quotationId,
  });
  const salesOrder = await input.sales.updateSalesOrder({
    tenantId: input.tenantId,
    salesOrderId: input.salesOrderId,
    prepared,
  });
  if (!salesOrder) {
    throw new SalesOrderNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "sales_order.updated",
    resource: "sales_order",
    resourceId: salesOrder.id,
    metadata: {
      number: salesOrder.number,
      grandTotal: moneySnapshot(salesOrder.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "SalesOrderUpdated",
    aggregateType: "SalesOrder",
    aggregateId: salesOrder.id,
    payload: { number: salesOrder.number, status: salesOrder.status },
  });

  return salesOrder;
}

export async function getSalesOrder(input: {
  tenantId: string;
  salesOrderId: string;
  sales: SalesRepository;
}): Promise<SalesOrder> {
  const salesOrder = await input.sales.findSalesOrderById(input.tenantId, input.salesOrderId);
  if (!salesOrder) {
    throw new SalesOrderNotFoundError();
  }
  return salesOrder;
}

export async function listSalesOrdersPage(input: {
  tenantId: string;
  query?: string;
  status?: SalesOrderStatus | "ALL";
  customerId?: string;
  fromDate?: SalesOrderListFilter["fromDate"];
  toDate?: SalesOrderListFilter["toDate"];
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  sales: SalesRepository;
}) {
  return input.sales.listSalesOrdersPage({
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

export async function listSalesOrders(input: {
  tenantId: string;
  query?: string;
  status?: SalesOrderStatus | "ALL";
  customerId?: string;
  sales: SalesRepository;
}): Promise<SalesOrder[]> {
  return input.sales.listSalesOrders({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    customerId: input.customerId,
  });
}

async function transitionSalesOrder(input: {
  tenantId: string;
  actorUserId: string;
  salesOrderId: string;
  status: SalesOrderStatus;
  action: string;
  eventType: DomainEventType;
} & Pick<SalesOrderUseCaseDeps, "sales" | "audit" | "outbox">): Promise<SalesOrder> {
  const existing = await input.sales.findSalesOrderById(input.tenantId, input.salesOrderId);
  if (!existing) {
    throw new SalesOrderNotFoundError();
  }
  assertSalesOrderTransition(existing.status, input.status);

  const salesOrder = await input.sales.updateSalesOrderStatus({
    tenantId: input.tenantId,
    salesOrderId: input.salesOrderId,
    status: input.status,
  });
  if (!salesOrder) {
    throw new SalesOrderNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: input.action,
    resource: "sales_order",
    resourceId: salesOrder.id,
    metadata: { number: salesOrder.number, from: existing.status, to: salesOrder.status },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateType: "SalesOrder",
    aggregateId: salesOrder.id,
    payload: { number: salesOrder.number, status: salesOrder.status },
  });

  return salesOrder;
}

export async function confirmSalesOrder(input: {
  tenantId: string;
  actorUserId: string;
  salesOrderId: string;
} & Pick<SalesOrderUseCaseDeps, "sales" | "audit" | "outbox">) {
  return transitionSalesOrder({
    ...input,
    status: "CONFIRMED",
    action: "sales_order.confirmed",
    eventType: "SalesOrderConfirmed",
  });
}

export async function cancelSalesOrder(input: {
  tenantId: string;
  actorUserId: string;
  salesOrderId: string;
} & Pick<SalesOrderUseCaseDeps, "sales" | "audit" | "outbox">) {
  return transitionSalesOrder({
    ...input,
    status: "CANCELLED",
    action: "sales_order.cancelled",
    eventType: "SalesOrderCancelled",
  });
}

export async function convertQuotationToSalesOrder(input: {
  tenantId: string;
  actorUserId: string;
  quotationId: string;
  taxContext: QuotationTaxContext;
} & SalesOrderUseCaseDeps): Promise<SalesOrder> {
  const quotation = await input.sales.findQuotationById(input.tenantId, input.quotationId);
  if (!quotation) {
    throw new QuotationNotFoundError();
  }
  if (quotation.status === "CONVERTED") {
    throw new QuotationAlreadyConvertedError();
  }
  if (quotation.status !== "ACCEPTED") {
    throw new QuotationStatusError(
      "Only accepted quotations can be converted to a sales order."
    );
  }

  const existingOrder = await input.sales.findSalesOrderByQuotationId(
    input.tenantId,
    input.quotationId
  );
  if (existingOrder) {
    throw new QuotationAlreadyConvertedError();
  }
  const existingInvoice = await input.sales.findInvoiceByQuotationId(
    input.tenantId,
    input.quotationId
  );
  if (existingInvoice) {
    throw new QuotationAlreadyConvertedError();
  }

  const prepared = preparedFromQuotation(quotation);
  const financialYearKey = salesOrderFinancialYearKey(
    prepared.issuedOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.sales.allocateNextSalesOrderNumber(
    input.tenantId,
    financialYearKey
  );
  const salesOrder = await input.sales.createSalesOrder({
    tenantId: input.tenantId,
    number: formatSalesOrderNumber(financialYearKey, sequence),
    prepared,
    status: "CONFIRMED",
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
    metadata: {
      number: quotation.number,
      salesOrderId: salesOrder.id,
      salesOrderNumber: salesOrder.number,
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "QuotationConverted",
    aggregateType: "quotation",
    aggregateId: quotation.id,
    payload: { number: quotation.number, salesOrderId: salesOrder.id },
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "sales_order.created",
    resource: "sales_order",
    resourceId: salesOrder.id,
    metadata: {
      number: salesOrder.number,
      quotationId: quotation.id,
      grandTotal: moneySnapshot(salesOrder.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "SalesOrderConfirmed",
    aggregateType: "SalesOrder",
    aggregateId: salesOrder.id,
    payload: {
      number: salesOrder.number,
      status: salesOrder.status,
      quotationId: quotation.id,
    },
  });

  return salesOrder;
}
