import { InvoiceStatusError } from "@/modules/sales/domain/errors";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

const TRANSITIONS: Record<SalesInvoiceStatus, readonly SalesInvoiceStatus[]> = {
  DRAFT: ["CANCELLED"],
  POSTED: ["UNPAID", "PARTIALLY_PAID", "PAID"],
  UNPAID: ["PARTIALLY_PAID", "PAID"],
  PARTIALLY_PAID: ["PARTIALLY_PAID", "PAID"],
  PAID: [],
  CANCELLED: [],
};

export function canTransitionInvoiceStatus(
  from: SalesInvoiceStatus,
  to: SalesInvoiceStatus
): boolean {
  if (from === to) {
    return true;
  }
  return TRANSITIONS[from].includes(to);
}

export function assertInvoiceTransition(
  from: SalesInvoiceStatus,
  to: SalesInvoiceStatus
): void {
  if (!canTransitionInvoiceStatus(from, to)) {
    throw new InvoiceStatusError(
      `A ${from.toLowerCase()} invoice cannot be marked ${to.toLowerCase()}.`
    );
  }
}

export function assertInvoiceEditable(status: SalesInvoiceStatus): void {
  if (status !== "DRAFT") {
    throw new InvoiceStatusError(
      "Only draft invoices can be edited. Posted invoices must be corrected with a reversal or credit note, not by changing amounts."
    );
  }
}

export function isPostedInvoiceStatus(status: SalesInvoiceStatus): boolean {
  return status !== "DRAFT" && status !== "CANCELLED";
}

export const RECEIVABLE_INVOICE_STATUSES: readonly SalesInvoiceStatus[] = [
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
];

export function isReceivableInvoiceStatus(status: SalesInvoiceStatus): boolean {
  return (
    status === "POSTED" || status === "UNPAID" || status === "PARTIALLY_PAID"
  );
}

export function paymentStatusLabel(status: SalesInvoiceStatus): string {
  if (status === "DRAFT") return "Draft";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "PAID") return "Paid";
  if (status === "PARTIALLY_PAID") return "Partially paid";
  if (status === "POSTED" || status === "UNPAID") return "Unpaid";
  return status;
}
