import type { BadgeTone } from "@/components/business/status-badge";
import type {
  QuotationStatus,
  SalesInvoiceStatus,
} from "@/modules/sales/domain/types";
import type { PurchaseStatus } from "@/modules/purchases/domain/types";
import { paymentStatusLabel } from "@/modules/sales/domain/invoice-status";

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  CANCELLED: "Cancelled",
  CONVERTED: "Converted",
};

export const QUOTATION_STATUS_TONES: Record<QuotationStatus, BadgeTone> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  CANCELLED: "danger",
  CONVERTED: "success",
};

export const INVOICE_STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const INVOICE_STATUS_TONES: Record<SalesInvoiceStatus, BadgeTone> = {
  DRAFT: "neutral",
  POSTED: "info",
  UNPAID: "warning",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CANCELLED: "danger",
};

/** Payment-facing badge for list/detail (Draft / Unpaid / Partially paid / Paid / Cancelled). */
export function invoicePaymentBadgePresentation(status: SalesInvoiceStatus): {
  tone: BadgeTone;
  label: string;
} {
  const label = paymentStatusLabel(status);
  if (status === "DRAFT") return { tone: "neutral", label };
  if (status === "CANCELLED") return { tone: "danger", label };
  if (status === "PAID") return { tone: "success", label };
  if (status === "PARTIALLY_PAID") return { tone: "info", label };
  if (status === "POSTED" || status === "UNPAID") return { tone: "warning", label };
  return { tone: "neutral", label };
}

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const PURCHASE_STATUS_TONES: Record<PurchaseStatus, BadgeTone> = {
  DRAFT: "neutral",
  POSTED: "info",
  UNPAID: "warning",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CANCELLED: "danger",
};

export type PartyActivityStatus = "ACTIVE" | "INACTIVE";

export const PARTY_STATUS_LABELS: Record<PartyActivityStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const PARTY_STATUS_TONES: Record<PartyActivityStatus, BadgeTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
};

export function stockStatusPresentation(input: {
  isLowStock: boolean;
  hasMovements: boolean;
}): { tone: BadgeTone; label: string } {
  if (!input.hasMovements) {
    return { tone: "neutral", label: "No movements yet" };
  }
  if (input.isLowStock) {
    return { tone: "warning", label: "Low stock" };
  }
  return { tone: "success", label: "In stock" };
}

export function catalogKindPresentation(kind: "PRODUCT" | "SERVICE"): {
  tone: BadgeTone;
  label: string;
} {
  return {
    tone: "info",
    label: kind === "SERVICE" ? "Service" : "Product",
  };
}

export function catalogTrackingPresentation(tracksInventory: boolean): {
  tone: BadgeTone;
  label: string;
} {
  return tracksInventory
    ? { tone: "info", label: "Inventory tracked" }
    : { tone: "neutral", label: "Inventory not tracked" };
}
