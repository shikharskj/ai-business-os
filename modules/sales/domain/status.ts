import { QuotationStatusError } from "@/modules/sales/domain/errors";
import type { QuotationStatus } from "@/modules/sales/domain/types";

const TRANSITIONS: Record<QuotationStatus, readonly QuotationStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["CONVERTED", "CANCELLED"],
  CANCELLED: [],
  CONVERTED: [],
};

export function canTransitionQuotationStatus(
  from: QuotationStatus,
  to: QuotationStatus
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertQuotationTransition(
  from: QuotationStatus,
  to: QuotationStatus
): void {
  if (!canTransitionQuotationStatus(from, to)) {
    throw new QuotationStatusError(
      `A ${from.toLowerCase()} quotation cannot be marked ${to.toLowerCase()}.`
    );
  }
}

export function assertQuotationEditable(status: QuotationStatus): void {
  if (status !== "DRAFT") {
    throw new QuotationStatusError(
      "Only draft quotations can be edited. Cancel and create a new quotation if the customer or lines need to change."
    );
  }
}
