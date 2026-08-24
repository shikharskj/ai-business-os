import { CreditNoteStatusError } from "@/modules/sales/domain/errors";
import type { CreditNoteStatus } from "@/modules/sales/domain/types";

const TRANSITIONS: Record<CreditNoteStatus, readonly CreditNoteStatus[]> = {
  DRAFT: ["POSTED", "CANCELLED"],
  POSTED: [],
  CANCELLED: [],
};

export function canTransitionCreditNoteStatus(
  from: CreditNoteStatus,
  to: CreditNoteStatus
): boolean {
  if (from === to) {
    return true;
  }
  return TRANSITIONS[from].includes(to);
}

export function assertCreditNoteTransition(
  from: CreditNoteStatus,
  to: CreditNoteStatus
): void {
  if (!canTransitionCreditNoteStatus(from, to)) {
    throw new CreditNoteStatusError(
      `A ${from.toLowerCase()} credit note cannot be marked ${to.toLowerCase()}.`
    );
  }
}

export function assertCreditNoteEditable(status: CreditNoteStatus): void {
  if (status !== "DRAFT") {
    throw new CreditNoteStatusError(
      "Only draft credit notes can be edited. Posted credit notes cannot be changed."
    );
  }
}

export function isPostedCreditNoteStatus(status: CreditNoteStatus): boolean {
  return status === "POSTED";
}

export const ACTIVE_CREDIT_NOTE_STATUSES: readonly CreditNoteStatus[] = [
  "DRAFT",
  "POSTED",
];

export function creditNoteStatusLabel(status: CreditNoteStatus): string {
  if (status === "DRAFT") return "Draft";
  if (status === "CANCELLED") return "Cancelled";
  return "Posted";
}
