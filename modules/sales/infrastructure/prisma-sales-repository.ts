import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fetchOrderedPage } from "@/modules/list-order/infrastructure/ordered-page";
import { paginateArray } from "@/modules/shared-kernel/list-page";
import { businessDate } from "@/modules/shared-kernel/dates";
import {
  addMoney,
  money,
  moneyFromPrismaDecimal,
  toDecimalForPrisma,
} from "@/modules/shared-kernel/money";
import {
  addQuantity,
  quantity,
  quantityFromPrismaDecimal,
  toQuantityDecimalForPrisma,
} from "@/modules/inventory/domain/quantity";
import type { GstSupplyType, GstTreatment } from "@/modules/tax/domain/types";
import type {
  CreditNote,
  CreditNoteLine,
  CreditNoteListFilter,
  CreditNoteStatus,
  InvoiceListFilter,
  PreparedCreditNote,
  PreparedInvoice,
  PreparedQuotation,
  PreparedSalesOrder,
  Quotation,
  QuotationLine,
  QuotationListFilter,
  QuotationStatus,
  SalesInvoice,
  SalesInvoiceLine,
  SalesInvoiceStatus,
  SalesOrder,
  SalesOrderLine,
  SalesOrderListFilter,
  SalesOrderStatus,
} from "@/modules/sales/domain/types";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import { isInvoiceOverdue, RECEIVABLE_INVOICE_STATUSES } from "@/modules/sales/domain/invoice-status";
import { ACTIVE_CREDIT_NOTE_STATUSES } from "@/modules/sales/domain/credit-note-status";

type PrismaSalesClient = Pick<
  PrismaClient,
  | "quotation"
  | "quotationLine"
  | "quotationNumberSeries"
  | "salesOrder"
  | "salesOrderLine"
  | "salesOrderNumberSeries"
  | "salesInvoice"
  | "salesInvoiceLine"
  | "invoiceNumberSeries"
  | "creditNote"
  | "creditNoteLine"
  | "creditNoteNumberSeries"
  | "$queryRaw"
>;

const QUOTATION_STATUSES = new Set<QuotationStatus>([
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "CANCELLED",
  "CONVERTED",
]);

const INVOICE_STATUSES = new Set<SalesInvoiceStatus>([
  "DRAFT",
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
]);

const CREDIT_NOTE_STATUSES = new Set<CreditNoteStatus>([
  "DRAFT",
  "POSTED",
  "CANCELLED",
]);

const SALES_ORDER_STATUSES = new Set<SalesOrderStatus>([
  "DRAFT",
  "CONFIRMED",
  "CANCELLED",
  "FULFILLED",
]);

function mapStatus(value: string): QuotationStatus {
  if (!QUOTATION_STATUSES.has(value as QuotationStatus)) {
    throw new Error("Unknown quotation status.");
  }
  return value as QuotationStatus;
}

function mapInvoiceStatus(value: string): SalesInvoiceStatus {
  if (!INVOICE_STATUSES.has(value as SalesInvoiceStatus)) {
    throw new Error("Unknown invoice status.");
  }
  return value as SalesInvoiceStatus;
}

function mapCreditNoteStatus(value: string): CreditNoteStatus {
  if (!CREDIT_NOTE_STATUSES.has(value as CreditNoteStatus)) {
    throw new Error("Unknown credit note status.");
  }
  return value as CreditNoteStatus;
}

function mapSalesOrderStatus(value: string): SalesOrderStatus {
  if (!SALES_ORDER_STATUSES.has(value as SalesOrderStatus)) {
    throw new Error("Unknown sales order status.");
  }
  return value as SalesOrderStatus;
}

function mapSupplyType(value: string): GstSupplyType | "MIXED" {
  if (
    value === "INTRA_STATE" ||
    value === "INTER_STATE" ||
    value === "NONE" ||
    value === "MIXED"
  ) {
    return value;
  }
  throw new Error("Unknown GST supply type.");
}

function mapLineSupplyType(value: string): GstSupplyType {
  if (value === "INTRA_STATE" || value === "INTER_STATE" || value === "NONE") {
    return value;
  }
  throw new Error("Unknown GST supply type.");
}

function mapTreatment(value: string): GstTreatment {
  if (
    value === "STANDARD" ||
    value === "NOT_REGISTERED" ||
    value === "COMPOSITION" ||
    value === "UNREGISTERED_COUNTERPARTY" ||
    value === "EXEMPT"
  ) {
    return value;
  }
  throw new Error("Unknown GST treatment.");
}

function lineCreateData(prepared: PreparedQuotation | PreparedInvoice | PreparedSalesOrder) {
  return prepared.lines.map((line) => ({
    sortOrder: line.sortOrder,
    productId: line.productId,
    productName: line.productName,
    sku: line.sku,
    unitOfMeasurement: line.unitOfMeasurement,
    hsnSac: line.hsnSac,
    taxRateBps: line.taxRateBps,
    quantity: toQuantityDecimalForPrisma(line.quantity),
    unitPrice: toDecimalForPrisma(line.unitPrice),
    discount: toDecimalForPrisma(line.discount),
    lineSubtotal: toDecimalForPrisma(line.lineSubtotal),
    taxableAmount: toDecimalForPrisma(line.taxableAmount),
    cgst: toDecimalForPrisma(line.cgst),
    sgst: toDecimalForPrisma(line.sgst),
    igst: toDecimalForPrisma(line.igst),
    totalTax: toDecimalForPrisma(line.totalTax),
    lineTotal: toDecimalForPrisma(line.lineTotal),
    supplyType: line.supplyType,
    treatment: line.treatment,
  }));
}

function salesOrderHeaderData(prepared: PreparedSalesOrder) {
  return {
    customerId: prepared.customerId,
    customerName: prepared.customerName,
    quotationId: prepared.quotationId,
    issuedOn: prepared.issuedOn,
    expectedOn: prepared.expectedOn,
    notes: prepared.notes,
    placeOfSupplyStateCode: prepared.placeOfSupplyStateCode,
    subtotal: toDecimalForPrisma(prepared.subtotal),
    discountTotal: toDecimalForPrisma(prepared.discountTotal),
    taxableAmount: toDecimalForPrisma(prepared.taxableAmount),
    cgst: toDecimalForPrisma(prepared.cgst),
    sgst: toDecimalForPrisma(prepared.sgst),
    igst: toDecimalForPrisma(prepared.igst),
    totalTax: toDecimalForPrisma(prepared.totalTax),
    grandTotal: toDecimalForPrisma(prepared.grandTotal),
    supplyType: prepared.supplyType,
  };
}

function headerData(prepared: PreparedQuotation | PreparedInvoice) {
  const base = {
    customerId: prepared.customerId,
    customerName: prepared.customerName,
    issuedOn: prepared.issuedOn,
    notes: prepared.notes,
    placeOfSupplyStateCode: prepared.placeOfSupplyStateCode,
    subtotal: toDecimalForPrisma(prepared.subtotal),
    discountTotal: toDecimalForPrisma(prepared.discountTotal),
    taxableAmount: toDecimalForPrisma(prepared.taxableAmount),
    cgst: toDecimalForPrisma(prepared.cgst),
    sgst: toDecimalForPrisma(prepared.sgst),
    igst: toDecimalForPrisma(prepared.igst),
    totalTax: toDecimalForPrisma(prepared.totalTax),
    grandTotal: toDecimalForPrisma(prepared.grandTotal),
    supplyType: prepared.supplyType,
  };
  if ("validUntil" in prepared) {
    return { ...base, validUntil: prepared.validUntil };
  }
  return { ...base, dueOn: prepared.dueOn };
}

function mapLine(record: {
  id: string;
  tenantId: string;
  quotationId: string;
  sortOrder: number;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasurement: string;
  hsnSac: string | null;
  taxRateBps: number;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  discount: { toString(): string };
  lineSubtotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  lineTotal: { toString(): string };
  supplyType: string;
  treatment: string;
}): QuotationLine {
  return {
    id: record.id,
    tenantId: record.tenantId,
    quotationId: record.quotationId,
    sortOrder: record.sortOrder,
    productId: record.productId,
    productName: record.productName,
    sku: record.sku,
    unitOfMeasurement: record.unitOfMeasurement,
    hsnSac: record.hsnSac,
    taxRateBps: record.taxRateBps,
    quantity: quantityFromPrismaDecimal(record.quantity),
    unitPrice: moneyFromPrismaDecimal(record.unitPrice),
    discount: moneyFromPrismaDecimal(record.discount),
    lineSubtotal: moneyFromPrismaDecimal(record.lineSubtotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    lineTotal: moneyFromPrismaDecimal(record.lineTotal),
    supplyType: mapLineSupplyType(record.supplyType),
    treatment: mapTreatment(record.treatment),
  };
}

function mapQuotation(record: {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  status: string;
  issuedOn: string;
  validUntil: string | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  grandTotal: { toString(): string };
  supplyType: string;
  createdAt: Date;
  updatedAt: Date;
  lines: Parameters<typeof mapLine>[0][];
}): Quotation {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    customerId: record.customerId,
    customerName: record.customerName,
    status: mapStatus(record.status),
    issuedOn: businessDate(record.issuedOn),
    validUntil: record.validUntil ? businessDate(record.validUntil) : null,
    notes: record.notes,
    placeOfSupplyStateCode: record.placeOfSupplyStateCode,
    subtotal: moneyFromPrismaDecimal(record.subtotal),
    discountTotal: moneyFromPrismaDecimal(record.discountTotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    grandTotal: moneyFromPrismaDecimal(record.grandTotal),
    supplyType: mapSupplyType(record.supplyType),
    lines: [...record.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapLine),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapInvoiceLine(record: {
  id: string;
  tenantId: string;
  invoiceId: string;
  sortOrder: number;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasurement: string;
  hsnSac: string | null;
  taxRateBps: number;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  discount: { toString(): string };
  lineSubtotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  lineTotal: { toString(): string };
  supplyType: string;
  treatment: string;
}): SalesInvoiceLine {
  return {
    id: record.id,
    tenantId: record.tenantId,
    invoiceId: record.invoiceId,
    sortOrder: record.sortOrder,
    productId: record.productId,
    productName: record.productName,
    sku: record.sku,
    unitOfMeasurement: record.unitOfMeasurement,
    hsnSac: record.hsnSac,
    taxRateBps: record.taxRateBps,
    quantity: quantityFromPrismaDecimal(record.quantity),
    unitPrice: moneyFromPrismaDecimal(record.unitPrice),
    discount: moneyFromPrismaDecimal(record.discount),
    lineSubtotal: moneyFromPrismaDecimal(record.lineSubtotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    lineTotal: moneyFromPrismaDecimal(record.lineTotal),
    supplyType: mapLineSupplyType(record.supplyType),
    treatment: mapTreatment(record.treatment),
  };
}

function mapInvoice(record: {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  status: string;
  quotationId: string | null;
  salesOrderId: string | null;
  journalId: string | null;
  issuedOn: string;
  dueOn: string | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  grandTotal: { toString(): string };
  supplyType: string;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Parameters<typeof mapInvoiceLine>[0][];
}): SalesInvoice {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    customerId: record.customerId,
    customerName: record.customerName,
    status: mapInvoiceStatus(record.status),
    quotationId: record.quotationId,
    salesOrderId: record.salesOrderId,
    journalId: record.journalId,
    issuedOn: businessDate(record.issuedOn),
    dueOn: record.dueOn ? businessDate(record.dueOn) : null,
    notes: record.notes,
    placeOfSupplyStateCode: record.placeOfSupplyStateCode,
    subtotal: moneyFromPrismaDecimal(record.subtotal),
    discountTotal: moneyFromPrismaDecimal(record.discountTotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    grandTotal: moneyFromPrismaDecimal(record.grandTotal),
    supplyType: mapSupplyType(record.supplyType),
    postedAt: record.postedAt,
    lines: [...record.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapInvoiceLine),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapSalesOrderLine(record: {
  id: string;
  tenantId: string;
  salesOrderId: string;
  sortOrder: number;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasurement: string;
  hsnSac: string | null;
  taxRateBps: number;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  discount: { toString(): string };
  lineSubtotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  lineTotal: { toString(): string };
  supplyType: string;
  treatment: string;
}): SalesOrderLine {
  return {
    id: record.id,
    tenantId: record.tenantId,
    salesOrderId: record.salesOrderId,
    sortOrder: record.sortOrder,
    productId: record.productId,
    productName: record.productName,
    sku: record.sku,
    unitOfMeasurement: record.unitOfMeasurement,
    hsnSac: record.hsnSac,
    taxRateBps: record.taxRateBps,
    quantity: quantityFromPrismaDecimal(record.quantity),
    unitPrice: moneyFromPrismaDecimal(record.unitPrice),
    discount: moneyFromPrismaDecimal(record.discount),
    lineSubtotal: moneyFromPrismaDecimal(record.lineSubtotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    lineTotal: moneyFromPrismaDecimal(record.lineTotal),
    supplyType: mapLineSupplyType(record.supplyType),
    treatment: mapTreatment(record.treatment),
  };
}

function mapSalesOrder(record: {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  status: string;
  quotationId: string | null;
  issuedOn: string;
  expectedOn: string | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  grandTotal: { toString(): string };
  supplyType: string;
  createdAt: Date;
  updatedAt: Date;
  lines: Parameters<typeof mapSalesOrderLine>[0][];
}): SalesOrder {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    customerId: record.customerId,
    customerName: record.customerName,
    status: mapSalesOrderStatus(record.status),
    quotationId: record.quotationId,
    issuedOn: businessDate(record.issuedOn),
    expectedOn: record.expectedOn ? businessDate(record.expectedOn) : null,
    notes: record.notes,
    placeOfSupplyStateCode: record.placeOfSupplyStateCode,
    subtotal: moneyFromPrismaDecimal(record.subtotal),
    discountTotal: moneyFromPrismaDecimal(record.discountTotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    grandTotal: moneyFromPrismaDecimal(record.grandTotal),
    supplyType: mapSupplyType(record.supplyType),
    lines: [...record.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapSalesOrderLine),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function creditNoteLineCreateData(prepared: PreparedCreditNote) {
  return prepared.lines.map((line) => ({
    sortOrder: line.sortOrder,
    sourceInvoiceLineId: line.sourceInvoiceLineId,
    productId: line.productId,
    productName: line.productName,
    sku: line.sku,
    unitOfMeasurement: line.unitOfMeasurement,
    hsnSac: line.hsnSac,
    taxRateBps: line.taxRateBps,
    quantity: toQuantityDecimalForPrisma(line.quantity),
    unitPrice: toDecimalForPrisma(line.unitPrice),
    discount: toDecimalForPrisma(line.discount),
    lineSubtotal: toDecimalForPrisma(line.lineSubtotal),
    taxableAmount: toDecimalForPrisma(line.taxableAmount),
    cgst: toDecimalForPrisma(line.cgst),
    sgst: toDecimalForPrisma(line.sgst),
    igst: toDecimalForPrisma(line.igst),
    totalTax: toDecimalForPrisma(line.totalTax),
    lineTotal: toDecimalForPrisma(line.lineTotal),
    supplyType: line.supplyType,
    treatment: line.treatment,
  }));
}

function mapCreditNoteLine(record: {
  id: string;
  tenantId: string;
  creditNoteId: string;
  sourceInvoiceLineId: string;
  sortOrder: number;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasurement: string;
  hsnSac: string | null;
  taxRateBps: number;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  discount: { toString(): string };
  lineSubtotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  lineTotal: { toString(): string };
  supplyType: string;
  treatment: string;
}): CreditNoteLine {
  return {
    id: record.id,
    tenantId: record.tenantId,
    creditNoteId: record.creditNoteId,
    sourceInvoiceLineId: record.sourceInvoiceLineId,
    sortOrder: record.sortOrder,
    productId: record.productId,
    productName: record.productName,
    sku: record.sku,
    unitOfMeasurement: record.unitOfMeasurement,
    hsnSac: record.hsnSac,
    taxRateBps: record.taxRateBps,
    quantity: quantityFromPrismaDecimal(record.quantity),
    unitPrice: moneyFromPrismaDecimal(record.unitPrice),
    discount: moneyFromPrismaDecimal(record.discount),
    lineSubtotal: moneyFromPrismaDecimal(record.lineSubtotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    lineTotal: moneyFromPrismaDecimal(record.lineTotal),
    supplyType: mapLineSupplyType(record.supplyType),
    treatment: mapTreatment(record.treatment),
  };
}

function mapCreditNote(record: {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  journalId: string | null;
  issuedOn: string;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  grandTotal: { toString(): string };
  supplyType: string;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Parameters<typeof mapCreditNoteLine>[0][];
}): CreditNote {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    customerId: record.customerId,
    customerName: record.customerName,
    invoiceId: record.invoiceId,
    invoiceNumber: record.invoiceNumber,
    status: mapCreditNoteStatus(record.status),
    journalId: record.journalId,
    issuedOn: businessDate(record.issuedOn),
    notes: record.notes,
    placeOfSupplyStateCode: record.placeOfSupplyStateCode,
    subtotal: moneyFromPrismaDecimal(record.subtotal),
    discountTotal: moneyFromPrismaDecimal(record.discountTotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    grandTotal: moneyFromPrismaDecimal(record.grandTotal),
    supplyType: mapSupplyType(record.supplyType),
    postedAt: record.postedAt,
    lines: [...record.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapCreditNoteLine),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function quotationWhereConditions(filter: QuotationListFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`q."tenantId" = ${filter.tenantId}`];
  if (filter.customerId) {
    conditions.push(Prisma.sql`q."customerId" = ${filter.customerId}`);
  }
  if (filter.status && filter.status !== "ALL") {
    conditions.push(Prisma.sql`q.status = ${filter.status}`);
  }
  if (filter.fromDate) {
    conditions.push(Prisma.sql`q."issuedOn" >= ${filter.fromDate}`);
  }
  if (filter.toDate) {
    conditions.push(Prisma.sql`q."issuedOn" <= ${filter.toDate}`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      q.number ILIKE ${pattern}
      OR q."customerName" ILIKE ${pattern}
    )`);
  }
  return conditions;
}

function invoiceWhereConditions(filter: InvoiceListFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`i."tenantId" = ${filter.tenantId}`];
  if (filter.customerId) {
    conditions.push(Prisma.sql`i."customerId" = ${filter.customerId}`);
  }
  if (filter.customerIds && filter.customerIds.length > 0) {
    conditions.push(
      Prisma.sql`i."customerId" IN (${Prisma.join(filter.customerIds)})`
    );
  }
  const statuses =
    filter.statuses && filter.statuses.length > 0
      ? [...filter.statuses]
      : !filter.status || filter.status === "ALL"
        ? undefined
        : [filter.status];
  if (statuses) {
    conditions.push(Prisma.sql`i.status IN (${Prisma.join(statuses)})`);
  }
  if (filter.fromDate) {
    conditions.push(Prisma.sql`i."issuedOn" >= ${filter.fromDate}`);
  }
  if (filter.toDate) {
    conditions.push(Prisma.sql`i."issuedOn" <= ${filter.toDate}`);
  }
  if (filter.due === "OVERDUE" && filter.overdueAsOf) {
    conditions.push(
      Prisma.sql`i.status IN (${Prisma.join([...RECEIVABLE_INVOICE_STATUSES])})`
    );
    conditions.push(Prisma.sql`i."dueOn" IS NOT NULL`);
    conditions.push(Prisma.sql`i."dueOn" < ${filter.overdueAsOf}`);
    conditions.push(Prisma.sql`i."grandTotal" > COALESCE((
      SELECT SUM(a.amount)
      FROM customer_payment_allocations a
      WHERE a."invoiceId" = i.id
        AND a."tenantId" = i."tenantId"
    ), 0) + COALESCE((
      SELECT SUM(cn."grandTotal")
      FROM credit_notes cn
      WHERE cn."invoiceId" = i.id
        AND cn."tenantId" = i."tenantId"
        AND cn.status = 'POSTED'
    ), 0)`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      i.number ILIKE ${pattern}
      OR i."customerName" ILIKE ${pattern}
    )`);
  }
  return conditions;
}

function salesOrderWhereConditions(filter: SalesOrderListFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`so."tenantId" = ${filter.tenantId}`];
  if (filter.customerId) {
    conditions.push(Prisma.sql`so."customerId" = ${filter.customerId}`);
  }
  if (filter.status && filter.status !== "ALL") {
    conditions.push(Prisma.sql`so.status = ${filter.status}`);
  }
  if (filter.fromDate) {
    conditions.push(Prisma.sql`so."issuedOn" >= ${filter.fromDate}`);
  }
  if (filter.toDate) {
    conditions.push(Prisma.sql`so."issuedOn" <= ${filter.toDate}`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      so.number ILIKE ${pattern}
      OR so."customerName" ILIKE ${pattern}
    )`);
  }
  return conditions;
}

function creditNoteWhereConditions(filter: CreditNoteListFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`cn."tenantId" = ${filter.tenantId}`];
  if (filter.customerId) {
    conditions.push(Prisma.sql`cn."customerId" = ${filter.customerId}`);
  }
  if (filter.invoiceId) {
    conditions.push(Prisma.sql`cn."invoiceId" = ${filter.invoiceId}`);
  }
  const statuses =
    filter.statuses && filter.statuses.length > 0
      ? [...filter.statuses]
      : !filter.status || filter.status === "ALL"
        ? undefined
        : [filter.status];
  if (statuses) {
    conditions.push(Prisma.sql`cn.status IN (${Prisma.join(statuses)})`);
  }
  if (filter.fromDate) {
    conditions.push(Prisma.sql`cn."issuedOn" >= ${filter.fromDate}`);
  }
  if (filter.toDate) {
    conditions.push(Prisma.sql`cn."issuedOn" <= ${filter.toDate}`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      cn.number ILIKE ${pattern}
      OR cn."customerName" ILIKE ${pattern}
      OR cn."invoiceNumber" ILIKE ${pattern}
    )`);
  }
  return conditions;
}

export function createPrismaSalesRepository(client: PrismaSalesClient): SalesRepository {
  return {
    async allocateNextQuotationNumber(tenantId, financialYearKey) {
      try {
        const series = await client.quotationNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          const series = await client.quotationNumberSeries.upsert({
            where: {
              tenantId_financialYearKey: { tenantId, financialYearKey },
            },
            create: { tenantId, financialYearKey, lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
          });
          return series.lastNumber;
        }
        throw error;
      }
    },

    async createQuotation(input) {
      const record = await client.quotation.create({
        data: {
          tenantId: input.tenantId,
          number: input.number,
          status: "DRAFT",
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapQuotation(record);
    },

    async updateQuotation(input) {
      const existing = await client.quotation.findFirst({
        where: { id: input.quotationId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }

      await client.quotationLine.deleteMany({
        where: { quotationId: existing.id, tenantId: input.tenantId },
      });

      const record = await client.quotation.update({
        where: { id: existing.id },
        data: {
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapQuotation(record);
    },

    async updateQuotationStatus(input) {
      const existing = await client.quotation.findFirst({
        where: { id: input.quotationId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.quotation.update({
        where: { id: existing.id },
        data: { status: input.status },
        include: { lines: true },
      });
      return mapQuotation(record);
    },

    async findQuotationById(tenantId, quotationId) {
      const record = await client.quotation.findFirst({
        where: { id: quotationId, tenantId },
        include: { lines: true },
      });
      return record ? mapQuotation(record) : null;
    },

    async listQuotations(filter) {
      const query = filter.query?.trim();
      const statusFilter =
        !filter.status || filter.status === "ALL" ? undefined : filter.status;

      const issuedOn =
        filter.fromDate || filter.toDate
          ? {
              ...(filter.fromDate ? { gte: filter.fromDate } : {}),
              ...(filter.toDate ? { lte: filter.toDate } : {}),
            }
          : undefined;

      const where: Prisma.QuotationWhereInput = {
        tenantId: filter.tenantId,
        ...(filter.customerId ? { customerId: filter.customerId } : {}),
        status: statusFilter,
        issuedOn,
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: "insensitive" } },
                { customerName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const records = await client.quotation.findMany({
        where,
        include: { lines: true },
        orderBy: [{ issuedOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapQuotation);
    },

    async listQuotationsPage(filter) {
      return fetchOrderedPage({
        client,
        tenantId: filter.tenantId,
        listKey: "quotations",
        fromSql: Prisma.sql`quotations q`,
        idColumn: Prisma.sql`q.id`,
        whereConditions: quotationWhereConditions(filter),
        defaultOrderSql: Prisma.sql`q."issuedOn" DESC, q.number DESC`,
        page: filter.page,
        pageSize: filter.pageSize,
        fetchByIds: async (ids) => {
          const records = await client.quotation.findMany({
            where: { tenantId: filter.tenantId, id: { in: ids } },
            include: { lines: true },
          });
          return records.map(mapQuotation);
        },
        getId: (quotation) => quotation.id,
      });
    },

    async allocateNextSalesOrderNumber(tenantId, financialYearKey) {
      try {
        const series = await client.salesOrderNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          const series = await client.salesOrderNumberSeries.upsert({
            where: {
              tenantId_financialYearKey: { tenantId, financialYearKey },
            },
            create: { tenantId, financialYearKey, lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
          });
          return series.lastNumber;
        }
        throw error;
      }
    },

    async createSalesOrder(input) {
      const record = await client.salesOrder.create({
        data: {
          tenantId: input.tenantId,
          number: input.number,
          status: input.status ?? "DRAFT",
          ...salesOrderHeaderData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapSalesOrder(record);
    },

    async updateSalesOrder(input) {
      const existing = await client.salesOrder.findFirst({
        where: { id: input.salesOrderId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }

      await client.salesOrderLine.deleteMany({
        where: { salesOrderId: existing.id, tenantId: input.tenantId },
      });

      const record = await client.salesOrder.update({
        where: { id: existing.id },
        data: {
          ...salesOrderHeaderData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapSalesOrder(record);
    },

    async updateSalesOrderStatus(input) {
      const existing = await client.salesOrder.findFirst({
        where: { id: input.salesOrderId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.salesOrder.update({
        where: { id: existing.id },
        data: { status: input.status },
        include: { lines: true },
      });
      return mapSalesOrder(record);
    },

    async findSalesOrderById(tenantId, salesOrderId) {
      const record = await client.salesOrder.findFirst({
        where: { id: salesOrderId, tenantId },
        include: { lines: true },
      });
      return record ? mapSalesOrder(record) : null;
    },

    async findSalesOrderByQuotationId(tenantId, quotationId) {
      const record = await client.salesOrder.findFirst({
        where: { quotationId, tenantId },
        include: { lines: true },
      });
      return record ? mapSalesOrder(record) : null;
    },

    async listSalesOrders(filter) {
      const query = filter.query?.trim();
      const statusFilter =
        !filter.status || filter.status === "ALL" ? undefined : filter.status;

      const issuedOn =
        filter.fromDate || filter.toDate
          ? {
              ...(filter.fromDate ? { gte: filter.fromDate } : {}),
              ...(filter.toDate ? { lte: filter.toDate } : {}),
            }
          : undefined;

      const where: Prisma.SalesOrderWhereInput = {
        tenantId: filter.tenantId,
        ...(filter.customerId ? { customerId: filter.customerId } : {}),
        status: statusFilter,
        issuedOn,
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: "insensitive" } },
                { customerName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const records = await client.salesOrder.findMany({
        where,
        include: { lines: true },
        orderBy: [{ issuedOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapSalesOrder);
    },

    async listSalesOrdersPage(filter) {
      return paginateArray(await this.listSalesOrders(filter), filter.page, filter.pageSize);
    },

    async allocateNextInvoiceNumber(tenantId, financialYearKey) {
      try {
        const series = await client.invoiceNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          const series = await client.invoiceNumberSeries.upsert({
            where: {
              tenantId_financialYearKey: { tenantId, financialYearKey },
            },
            create: { tenantId, financialYearKey, lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
          });
          return series.lastNumber;
        }
        throw error;
      }
    },

    async createInvoice(input) {
      const record = await client.salesInvoice.create({
        data: {
          tenantId: input.tenantId,
          number: input.number,
          status: "DRAFT",
          quotationId: input.quotationId ?? null,
          salesOrderId: input.salesOrderId ?? null,
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapInvoice(record);
    },

    async updateInvoice(input) {
      const existing = await client.salesInvoice.findFirst({
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }

      await client.salesInvoiceLine.deleteMany({
        where: { invoiceId: existing.id, tenantId: input.tenantId },
      });

      const record = await client.salesInvoice.update({
        where: { id: existing.id },
        data: {
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapInvoice(record);
    },

    async markInvoicePosted(input) {
      const existing = await client.salesInvoice.findFirst({
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.salesInvoice.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          journalId: input.journalId,
          postedAt: input.postedAt,
        },
        include: { lines: true },
      });
      return mapInvoice(record);
    },

    async updateInvoiceStatus(input) {
      const existing = await client.salesInvoice.findFirst({
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.salesInvoice.update({
        where: { id: existing.id },
        data: { status: input.status },
        include: { lines: true },
      });
      return mapInvoice(record);
    },

    async lockInvoiceForUpdate(tenantId, invoiceId) {
      if (client === prisma) {
        throw new Error(
          "lockInvoiceForUpdate requires a transaction-bound Prisma client. " +
          "The row lock must remain held through findFirst and mapInvoice. " +
          "Use prisma.$transaction() and pass the transaction client to createPrismaSalesRepository()."
        );
      }
      await client.$queryRaw`
        SELECT id FROM sales_invoices
        WHERE id = ${invoiceId} AND "tenantId" = ${tenantId}
        FOR UPDATE
      `;
      const record = await client.salesInvoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { lines: true },
      });
      return record ? mapInvoice(record) : null;
    },

    async findInvoiceById(tenantId, invoiceId) {
      const record = await client.salesInvoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { lines: true },
      });
      return record ? mapInvoice(record) : null;
    },

    async findInvoiceByQuotationId(tenantId, quotationId) {
      const record = await client.salesInvoice.findFirst({
        where: { quotationId, tenantId },
        include: { lines: true },
      });
      return record ? mapInvoice(record) : null;
    },

    async findInvoiceBySalesOrderId(tenantId, salesOrderId) {
      const record = await client.salesInvoice.findFirst({
        where: { salesOrderId, tenantId },
        include: { lines: true },
      });
      return record ? mapInvoice(record) : null;
    },

    async listInvoices(filter) {
      const query = filter.query?.trim();
      const statuses =
        filter.statuses && filter.statuses.length > 0
          ? [...filter.statuses]
          : !filter.status || filter.status === "ALL"
            ? undefined
            : [filter.status];

      const issuedOn =
        filter.fromDate || filter.toDate
          ? {
              ...(filter.fromDate ? { gte: filter.fromDate } : {}),
              ...(filter.toDate ? { lte: filter.toDate } : {}),
            }
          : undefined;

      const where: Prisma.SalesInvoiceWhereInput = {
        tenantId: filter.tenantId,
        ...(filter.customerIds && filter.customerIds.length > 0
          ? { customerId: { in: [...filter.customerIds] } }
          : filter.customerId
            ? { customerId: filter.customerId }
            : {}),
        status:
          filter.due === "OVERDUE"
            ? { in: [...RECEIVABLE_INVOICE_STATUSES] }
            : statuses
              ? { in: statuses }
              : undefined,
        issuedOn,
        ...(filter.due === "OVERDUE" && filter.overdueAsOf
          ? { dueOn: { not: null, lt: filter.overdueAsOf } }
          : {}),
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: "insensitive" } },
                { customerName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const records = await client.salesInvoice.findMany({
        where,
        include: { lines: true, paymentAllocations: true, creditNotes: true },
        orderBy: [{ issuedOn: "desc" }, { number: "desc" }],
      });
      return records.flatMap((record) => {
        const invoice = mapInvoice(record);
        if (filter.due !== "OVERDUE" || !filter.overdueAsOf) {
          return [invoice];
        }
        let allocatedMinor = 0n;
        for (const allocation of record.paymentAllocations) {
          allocatedMinor += moneyFromPrismaDecimal(allocation.amount).amountMinor;
        }
        let creditedMinor = 0n;
        for (const creditNote of record.creditNotes) {
          if (creditNote.status !== "POSTED") continue;
          creditedMinor += moneyFromPrismaDecimal(creditNote.grandTotal).amountMinor;
        }
        const applied = allocatedMinor + creditedMinor;
        const outstandingMinor =
          applied >= invoice.grandTotal.amountMinor
            ? 0n
            : invoice.grandTotal.amountMinor - applied;
        return isInvoiceOverdue({
          dueOn: invoice.dueOn,
          status: invoice.status,
          outstandingMinor,
          asOf: filter.overdueAsOf,
        })
          ? [invoice]
          : [];
      });
    },

    async listInvoicesPage(filter) {
      return fetchOrderedPage({
        client,
        tenantId: filter.tenantId,
        listKey: "invoices",
        fromSql: Prisma.sql`sales_invoices i`,
        idColumn: Prisma.sql`i.id`,
        whereConditions: invoiceWhereConditions(filter),
        defaultOrderSql: Prisma.sql`i."issuedOn" DESC, i.number DESC`,
        page: filter.page,
        pageSize: filter.pageSize,
        fetchByIds: async (ids) => {
          const records = await client.salesInvoice.findMany({
            where: { tenantId: filter.tenantId, id: { in: ids } },
            include: { lines: true },
          });
          return records.map(mapInvoice);
        },
        getId: (invoice) => invoice.id,
      });
    },

    async allocateNextCreditNoteNumber(tenantId, financialYearKey) {
      try {
        const series = await client.creditNoteNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          const series = await client.creditNoteNumberSeries.upsert({
            where: {
              tenantId_financialYearKey: { tenantId, financialYearKey },
            },
            create: { tenantId, financialYearKey, lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
          });
          return series.lastNumber;
        }
        throw error;
      }
    },

    async createCreditNote(input) {
      const record = await client.creditNote.create({
        data: {
          tenantId: input.tenantId,
          number: input.number,
          customerId: input.prepared.customerId,
          customerName: input.prepared.customerName,
          invoiceId: input.prepared.invoiceId,
          invoiceNumber: input.prepared.invoiceNumber,
          issuedOn: input.prepared.issuedOn,
          notes: input.prepared.notes,
          placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
          subtotal: toDecimalForPrisma(input.prepared.subtotal),
          discountTotal: toDecimalForPrisma(input.prepared.discountTotal),
          taxableAmount: toDecimalForPrisma(input.prepared.taxableAmount),
          cgst: toDecimalForPrisma(input.prepared.cgst),
          sgst: toDecimalForPrisma(input.prepared.sgst),
          igst: toDecimalForPrisma(input.prepared.igst),
          totalTax: toDecimalForPrisma(input.prepared.totalTax),
          grandTotal: toDecimalForPrisma(input.prepared.grandTotal),
          supplyType: input.prepared.supplyType,
          lines: { create: creditNoteLineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapCreditNote(record);
    },

    async updateCreditNote(input) {
      const existing = await client.creditNote.findFirst({
        where: { id: input.creditNoteId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      await client.creditNoteLine.deleteMany({
        where: { creditNoteId: existing.id, tenantId: input.tenantId },
      });
      const record = await client.creditNote.update({
        where: { id: existing.id },
        data: {
          customerId: input.prepared.customerId,
          customerName: input.prepared.customerName,
          invoiceId: input.prepared.invoiceId,
          invoiceNumber: input.prepared.invoiceNumber,
          issuedOn: input.prepared.issuedOn,
          notes: input.prepared.notes,
          placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
          subtotal: toDecimalForPrisma(input.prepared.subtotal),
          discountTotal: toDecimalForPrisma(input.prepared.discountTotal),
          taxableAmount: toDecimalForPrisma(input.prepared.taxableAmount),
          cgst: toDecimalForPrisma(input.prepared.cgst),
          sgst: toDecimalForPrisma(input.prepared.sgst),
          igst: toDecimalForPrisma(input.prepared.igst),
          totalTax: toDecimalForPrisma(input.prepared.totalTax),
          grandTotal: toDecimalForPrisma(input.prepared.grandTotal),
          supplyType: input.prepared.supplyType,
          lines: { create: creditNoteLineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapCreditNote(record);
    },

    async markCreditNotePosted(input) {
      const existing = await client.creditNote.findFirst({
        where: { id: input.creditNoteId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.creditNote.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          journalId: input.journalId,
          postedAt: input.postedAt,
        },
        include: { lines: true },
      });
      return mapCreditNote(record);
    },

    async updateCreditNoteStatus(input) {
      const existing = await client.creditNote.findFirst({
        where: { id: input.creditNoteId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.creditNote.update({
        where: { id: existing.id },
        data: { status: input.status },
        include: { lines: true },
      });
      return mapCreditNote(record);
    },

    async findCreditNoteById(tenantId, creditNoteId) {
      const record = await client.creditNote.findFirst({
        where: { id: creditNoteId, tenantId },
        include: { lines: true },
      });
      return record ? mapCreditNote(record) : null;
    },

    async listCreditNotes(filter) {
      const query = filter.query?.trim();
      const statuses =
        filter.statuses && filter.statuses.length > 0
          ? [...filter.statuses]
          : !filter.status || filter.status === "ALL"
            ? undefined
            : [filter.status];
      const issuedOn =
        filter.fromDate || filter.toDate
          ? {
              ...(filter.fromDate ? { gte: filter.fromDate } : {}),
              ...(filter.toDate ? { lte: filter.toDate } : {}),
            }
          : undefined;
      const records = await client.creditNote.findMany({
        where: {
          tenantId: filter.tenantId,
          ...(filter.customerId ? { customerId: filter.customerId } : {}),
          ...(filter.invoiceId ? { invoiceId: filter.invoiceId } : {}),
          status: statuses ? { in: statuses } : undefined,
          issuedOn,
          ...(query
            ? {
                OR: [
                  { number: { contains: query, mode: "insensitive" } },
                  { customerName: { contains: query, mode: "insensitive" } },
                  { invoiceNumber: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { lines: true },
        orderBy: [{ issuedOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapCreditNote);
    },

    async listCreditNotesPage(filter) {
      return paginateArray(await this.listCreditNotes(filter), filter.page, filter.pageSize);
    },

    async creditedTotalsForInvoices(tenantId, invoiceIds) {
      const totals = new Map<string, ReturnType<typeof money>>();
      if (invoiceIds.length === 0) {
        return totals;
      }
      const records = await client.creditNote.findMany({
        where: {
          tenantId,
          invoiceId: { in: [...invoiceIds] },
          status: "POSTED",
        },
        select: { invoiceId: true, grandTotal: true },
      });
      for (const record of records) {
        const amount = moneyFromPrismaDecimal(record.grandTotal);
        const current =
          totals.get(record.invoiceId) ?? money(0n, amount.currency, amount.scale);
        totals.set(record.invoiceId, addMoney(current, amount));
      }
      return totals;
    },

    async creditedQuantityByInvoiceLine(input) {
      const quantities = new Map<
        string,
        ReturnType<typeof quantity>
      >();
      const records = await client.creditNote.findMany({
        where: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          status: { in: [...ACTIVE_CREDIT_NOTE_STATUSES] },
          ...(input.excludeCreditNoteId
            ? { id: { not: input.excludeCreditNoteId } }
            : {}),
        },
        include: { lines: true },
      });
      for (const record of records) {
        for (const line of record.lines) {
          const qty = quantityFromPrismaDecimal(line.quantity);
          const current = quantities.get(line.sourceInvoiceLineId) ?? quantity(0n);
          quantities.set(line.sourceInvoiceLineId, addQuantity(current, qty));
        }
      }
      return quantities;
    },
  };
}

export const prismaSalesRepository = createPrismaSalesRepository(prisma);
