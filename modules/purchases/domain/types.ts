import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";
import type { Quantity } from "@/modules/inventory/domain/quantity";
import type { GstSupplyType, GstTreatment } from "@/modules/tax/domain/types";

export const PURCHASE_STATUSES = [
  "DRAFT",
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export type PurchaseLine = {
  id: string;
  tenantId: string;
  purchaseId: string;
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

export type Purchase = {
  id: string;
  tenantId: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
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
  lines: PurchaseLine[];
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseLineInput = {
  productId: string;
  quantity: Quantity;
  unitPrice?: Money;
  discount?: Money;
};

export type PurchaseInput = {
  supplierId: string;
  issuedOn: BusinessDate;
  dueOn?: BusinessDate | null;
  notes?: string | null;
  placeOfSupplyStateCode?: string | null;
  lines: PurchaseLineInput[];
};

export type PurchaseListFilter = {
  tenantId: string;
  query?: string;
  status?: PurchaseStatus | "ALL";
  supplierId?: string;
  statuses?: readonly PurchaseStatus[];
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type PurchaseTaxContext = {
  gstin: string | null;
  gstRegistrationStatus: "NOT_REGISTERED" | "REGISTERED" | "COMPOSITION";
  stateName: string;
  defaultGstRateBps: number;
  financialYearStartMonth: number;
  currency: string;
};

export type PreparedPurchaseLine = Omit<
  PurchaseLine,
  "id" | "tenantId" | "purchaseId"
>;

export type PreparedPurchase = {
  supplierId: string;
  supplierName: string;
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
  lines: PreparedPurchaseLine[];
};

export type SupplierOutstanding = {
  supplierId: string;
  outstanding: Money;
  openBillCount: number;
  hasPostedPurchases: boolean;
};

export const PURCHASE_RETURN_STATUSES = ["DRAFT", "POSTED", "CANCELLED"] as const;

export type PurchaseReturnStatus = (typeof PURCHASE_RETURN_STATUSES)[number];

export type PurchaseReturnLine = {
  id: string;
  tenantId: string;
  purchaseReturnId: string;
  sourcePurchaseLineId: string;
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

export type PurchaseReturn = {
  id: string;
  tenantId: string;
  number: string;
  supplierId: string;
  supplierName: string;
  purchaseId: string;
  purchaseNumber: string;
  status: PurchaseReturnStatus;
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
  lines: PurchaseReturnLine[];
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseReturnLineInput = {
  purchaseLineId: string;
  quantity: Quantity;
};

export type PurchaseReturnInput = {
  purchaseId: string;
  issuedOn: BusinessDate;
  notes?: string | null;
  lines: PurchaseReturnLineInput[];
};

export type PurchaseReturnListFilter = {
  tenantId: string;
  query?: string;
  status?: PurchaseReturnStatus | "ALL";
  supplierId?: string;
  purchaseId?: string;
  statuses?: readonly PurchaseReturnStatus[];
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type PreparedPurchaseReturnLine = Omit<
  PurchaseReturnLine,
  "id" | "tenantId" | "purchaseReturnId"
>;

export type PreparedPurchaseReturn = {
  supplierId: string;
  supplierName: string;
  purchaseId: string;
  purchaseNumber: string;
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
  lines: PreparedPurchaseReturnLine[];
};
