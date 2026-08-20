import { PurchaseStatusError } from "@/modules/purchases/domain/errors";
import type { PurchaseStatus } from "@/modules/purchases/domain/types";

const TRANSITIONS: Record<PurchaseStatus, readonly PurchaseStatus[]> = {
  DRAFT: ["POSTED", "CANCELLED"],
  POSTED: ["UNPAID", "PARTIALLY_PAID", "PAID"],
  UNPAID: ["PARTIALLY_PAID", "PAID"],
  PARTIALLY_PAID: ["PARTIALLY_PAID", "PAID"],
  PAID: [],
  CANCELLED: [],
};

export function canTransitionPurchaseStatus(
  from: PurchaseStatus,
  to: PurchaseStatus
): boolean {
  if (from === to) {
    return true;
  }
  return TRANSITIONS[from].includes(to);
}

export function assertPurchaseTransition(
  from: PurchaseStatus,
  to: PurchaseStatus
): void {
  if (!canTransitionPurchaseStatus(from, to)) {
    throw new PurchaseStatusError(
      `A ${from.toLowerCase()} purchase bill cannot be marked ${to.toLowerCase()}.`
    );
  }
}

export function assertPurchaseEditable(status: PurchaseStatus): void {
  if (status !== "DRAFT") {
    throw new PurchaseStatusError(
      "Only draft purchase bills can be edited. Posted bills must be corrected with a reversal or debit note, not by changing amounts."
    );
  }
}

export function isPostedPurchaseStatus(status: PurchaseStatus): boolean {
  return status !== "DRAFT" && status !== "CANCELLED";
}

export const PAYABLE_PURCHASE_STATUSES: readonly PurchaseStatus[] = [
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
];

export function isPayablePurchaseStatus(status: PurchaseStatus): boolean {
  return (
    status === "POSTED" || status === "UNPAID" || status === "PARTIALLY_PAID"
  );
}

export function purchasePaymentStatusLabel(status: PurchaseStatus): string {
  if (status === "DRAFT") return "Draft";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "PAID") return "Paid";
  if (status === "PARTIALLY_PAID") return "Partially paid";
  if (status === "POSTED" || status === "UNPAID") return "Unpaid";
  return status;
}
