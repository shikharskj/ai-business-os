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
