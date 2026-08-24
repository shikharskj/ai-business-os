import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";
import type { StoredGstAmounts } from "@/modules/tax/domain/sum-stored-gst";

export type GstDocumentKind =
  | "SALES_INVOICE"
  | "SALES_CREDIT_NOTE"
  | "PURCHASE"
  | "PURCHASE_RETURN"
  | "EXPENSE";

export type GstTaxFlow = "OUTPUT" | "INPUT";

export type GstTransactionRow = {
  tenantId: string;
  documentKind: GstDocumentKind;
  taxFlow: GstTaxFlow;
  documentId: string;
  documentNumber: string;
  businessDate: BusinessDate;
  partyName: string | null;
  supplyType: string;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
};

export type GstPeriodSummary = {
  tenantId: string;
  periodKey: string;
  fromDate: BusinessDate;
  toDate: BusinessDate;
  output: StoredGstAmounts;
  input: StoredGstAmounts;
  /** Output tax − input tax (informational; not a filing figure). */
  netTax: Money;
  rows: GstTransactionRow[];
};

/** Posted invoice statuses that carry authoritative GST (excludes draft/cancelled). */
export const GST_SALES_STATUSES = [
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
] as const;

/** Posted purchase statuses that carry authoritative GST (excludes draft/cancelled). */
export const GST_PURCHASE_STATUSES = [
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
] as const;

export const GST_CREDIT_NOTE_STATUSES = ["POSTED"] as const;

export const GST_PURCHASE_RETURN_STATUSES = ["POSTED"] as const;
