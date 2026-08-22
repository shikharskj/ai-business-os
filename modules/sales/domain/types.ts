import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";
import type { Quantity } from "@/modules/inventory/domain/quantity";
import type { GstSupplyType, GstTreatment } from "@/modules/tax/domain/types";

export const QUOTATION_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "CANCELLED",
  "CONVERTED",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export type QuotationLine = {
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
  quantity: Quantity;
  unitPrice: Money;
  discount: Money;
  lineSubtotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  lineTotal: Money;
  supplyType: GstSupplyType;
  treatment: GstTreatment;
};

export type Quotation = {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  status: QuotationStatus;
  issuedOn: BusinessDate;
  validUntil: BusinessDate | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
  lines: QuotationLine[];
  createdAt: Date;
  updatedAt: Date;
};

export type QuotationLineInput = {
  productId: string;
  quantity: Quantity;
  unitPrice?: Money;
  discount?: Money;
};

export type QuotationInput = {
  customerId: string;
  issuedOn: BusinessDate;
  validUntil?: BusinessDate | null;
  notes?: string | null;
  placeOfSupplyStateCode?: string | null;
  lines: QuotationLineInput[];
};

export type QuotationListFilter = {
  tenantId: string;
  query?: string;
  status?: QuotationStatus | "ALL";
  customerId?: string;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type QuotationTaxContext = {
  gstin: string | null;
  gstRegistrationStatus: "NOT_REGISTERED" | "REGISTERED" | "COMPOSITION";
  stateName: string;
  defaultGstRateBps: number;
  financialYearStartMonth: number;
  currency: string;
};

export type PreparedQuotationLine = Omit<
  QuotationLine,
  "id" | "tenantId" | "quotationId"
>;

export type PreparedQuotation = {
  customerId: string;
  customerName: string;
  issuedOn: BusinessDate;
  validUntil: BusinessDate | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
  lines: PreparedQuotationLine[];
};

export const SALES_ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "CANCELLED",
  "FULFILLED",
] as const;

export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export type SalesOrderLine = {
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
  quantity: Quantity;
  unitPrice: Money;
  discount: Money;
  lineSubtotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  lineTotal: Money;
  supplyType: GstSupplyType;
  treatment: GstTreatment;
};

export type SalesOrder = {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  status: SalesOrderStatus;
  quotationId: string | null;
  issuedOn: BusinessDate;
  expectedOn: BusinessDate | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
  lines: SalesOrderLine[];
  createdAt: Date;
  updatedAt: Date;
};

export type SalesOrderLineInput = QuotationLineInput;

export type SalesOrderInput = {
  customerId: string;
  issuedOn: BusinessDate;
  expectedOn?: BusinessDate | null;
  notes?: string | null;
  placeOfSupplyStateCode?: string | null;
  lines: SalesOrderLineInput[];
};

export type SalesOrderListFilter = {
  tenantId: string;
  query?: string;
  status?: SalesOrderStatus | "ALL";
  customerId?: string;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type PreparedSalesOrderLine = Omit<
  SalesOrderLine,
  "id" | "tenantId" | "salesOrderId"
>;

export type PreparedSalesOrder = {
  customerId: string;
  customerName: string;
  quotationId: string | null;
  issuedOn: BusinessDate;
  expectedOn: BusinessDate | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
  lines: PreparedSalesOrderLine[];
};

export const INVOICE_STATUSES = [
  "DRAFT",
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;

export type SalesInvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type SalesInvoiceLine = {
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
  quantity: Quantity;
  unitPrice: Money;
  discount: Money;
  lineSubtotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  lineTotal: Money;
  supplyType: GstSupplyType;
  treatment: GstTreatment;
};

export type SalesInvoice = {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  status: SalesInvoiceStatus;
  quotationId: string | null;
  salesOrderId: string | null;
  journalId: string | null;
  issuedOn: BusinessDate;
  dueOn: BusinessDate | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
  postedAt: Date | null;
  lines: SalesInvoiceLine[];
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceLineInput = QuotationLineInput;

export type InvoiceInput = {
  customerId: string;
  issuedOn: BusinessDate;
  dueOn?: BusinessDate | null;
  notes?: string | null;
  placeOfSupplyStateCode?: string | null;
  lines: InvoiceLineInput[];
};

export type InvoiceDueFilter = "ALL" | "OVERDUE";

export type InvoiceListFilter = {
  tenantId: string;
  query?: string;
  status?: SalesInvoiceStatus | "ALL";
  customerId?: string;
  customerIds?: readonly string[];
  statuses?: readonly SalesInvoiceStatus[];
  due?: InvoiceDueFilter;
  overdueAsOf?: BusinessDate;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type PreparedInvoiceLine = PreparedQuotationLine;

export type PreparedInvoice = Omit<PreparedQuotation, "validUntil"> & {
  dueOn: BusinessDate | null;
};

export type SalesTaxContext = QuotationTaxContext;

export const CREDIT_NOTE_STATUSES = ["DRAFT", "POSTED", "CANCELLED"] as const;

export type CreditNoteStatus = (typeof CREDIT_NOTE_STATUSES)[number];

export type CreditNoteLine = {
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
  quantity: Quantity;
  unitPrice: Money;
  discount: Money;
  lineSubtotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  lineTotal: Money;
  supplyType: GstSupplyType;
  treatment: GstTreatment;
};

export type CreditNote = {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  status: CreditNoteStatus;
  journalId: string | null;
  issuedOn: BusinessDate;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
  postedAt: Date | null;
  lines: CreditNoteLine[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreditNoteLineInput = {
  invoiceLineId: string;
  quantity: Quantity;
};

export type CreditNoteInput = {
  invoiceId: string;
  issuedOn: BusinessDate;
  notes?: string | null;
  lines: CreditNoteLineInput[];
};

export type CreditNoteListFilter = {
  tenantId: string;
  query?: string;
  status?: CreditNoteStatus | "ALL";
  customerId?: string;
  invoiceId?: string;
  statuses?: readonly CreditNoteStatus[];
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type PreparedCreditNoteLine = Omit<
  CreditNoteLine,
  "id" | "tenantId" | "creditNoteId"
>;

export type PreparedCreditNote = {
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  issuedOn: BusinessDate;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
  lines: PreparedCreditNoteLine[];
};
