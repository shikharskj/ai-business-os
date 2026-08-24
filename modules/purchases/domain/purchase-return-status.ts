import { PurchaseReturnStatusError } from "@/modules/purchases/domain/errors";
import type { PurchaseReturnStatus } from "@/modules/purchases/domain/types";

const TRANSITIONS: Record<PurchaseReturnStatus, readonly PurchaseReturnStatus[]> = {
  DRAFT: ["POSTED", "CANCELLED"],
  POSTED: [],
  CANCELLED: [],
};

export function canTransitionPurchaseReturnStatus(
  from: PurchaseReturnStatus,
  to: PurchaseReturnStatus
): boolean {
  if (from === to) {
    return true;
  }
  return TRANSITIONS[from].includes(to);
}

export function assertPurchaseReturnTransition(
  from: PurchaseReturnStatus,
  to: PurchaseReturnStatus
): void {
  if (!canTransitionPurchaseReturnStatus(from, to)) {
    throw new PurchaseReturnStatusError(
      `A ${from.toLowerCase()} purchase return cannot be marked ${to.toLowerCase()}.`
    );
  }
}

export function assertPurchaseReturnEditable(status: PurchaseReturnStatus): void {
  if (status !== "DRAFT") {
    throw new PurchaseReturnStatusError(
      "Only draft purchase returns can be edited. Posted returns cannot be changed."
    );
  }
}

export function isPostedPurchaseReturnStatus(status: PurchaseReturnStatus): boolean {
  return status === "POSTED";
}

export const ACTIVE_PURCHASE_RETURN_STATUSES: readonly PurchaseReturnStatus[] = [
  "DRAFT",
  "POSTED",
];

export function purchaseReturnStatusLabel(status: PurchaseReturnStatus): string {
  if (status === "DRAFT") return "Draft";
  if (status === "CANCELLED") return "Cancelled";
  return "Posted";
}
