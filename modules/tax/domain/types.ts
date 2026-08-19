import type { Money } from "@/modules/shared-kernel/money";
import type { BusinessDate } from "@/modules/shared-kernel/dates";

export type GstRegistrationStatus =
  | "NOT_REGISTERED"
  | "REGISTERED"
  | "COMPOSITION";

export type TaxTransactionType = "SALE" | "PURCHASE" | "EXPENSE";

export type GstSupplyType = "INTRA_STATE" | "INTER_STATE" | "NONE";

export type GstTreatment =
  | "STANDARD"
  | "NOT_REGISTERED"
  | "COMPOSITION"
  | "UNREGISTERED_COUNTERPARTY"
  | "EXEMPT";

export type GstBreakdown = {
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType;
  treatment: GstTreatment;
  taxRateBps: number;
  hsnSac: string | null;
};

export type GstCalculationInput = {
  businessGstin: string | null;
  businessGstRegistrationStatus: GstRegistrationStatus;
  businessStateCode: string | null;
  counterpartyGstin: string | null;
  placeOfSupplyStateCode: string;
  transactionType: TaxTransactionType;
  hsnSac: string | null;
  taxableAmount: Money;
  taxRateBps: number;
};

export type TaxRateRecord = {
  id: string;
  tenantId: string;
  name: string;
  rateBps: number;
  isDefault: boolean;
  effectiveFrom: BusinessDate;
  effectiveTo: BusinessDate | null;
};

export type HsnSacRecord = {
  id: string;
  tenantId: string;
  code: string;
  description: string;
  kind: "HSN" | "SAC";
  taxRateBps: number;
  effectiveFrom: BusinessDate;
  effectiveTo: BusinessDate | null;
};

/** Common GST slab rates in basis points (1800 = 18.00%). */
export const COMMON_GST_RATE_BPS = [0, 500, 1200, 1800, 2800] as const;

export const DEFAULT_GST_RATE_BPS = 1800;
