import type { Money } from "@/modules/shared-kernel/money";
import type { PurchaseStatus } from "@/modules/purchases/domain/types";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

export function invoiceStatusFromOutstanding(
  grandTotal: Money,
  outstanding: Money
): Extract<SalesInvoiceStatus, "PAID" | "PARTIALLY_PAID" | "UNPAID"> {
  if (outstanding.amountMinor < 0n) {
    throw new Error("Invoice outstanding cannot be negative.");
  }
  if (outstanding.amountMinor === 0n) {
    return "PAID";
  }
  if (outstanding.amountMinor === grandTotal.amountMinor) {
    return "UNPAID";
  }
  return "PARTIALLY_PAID";
}

/**
 * Posted invoices with no allocations stay POSTED (shown as unpaid).
 * After a payment, status becomes PARTIALLY_PAID or PAID.
 */
export function nextInvoicePaymentStatus(input: {
  currentStatus: SalesInvoiceStatus;
  grandTotal: Money;
  outstanding: Money;
}): SalesInvoiceStatus {
  const derived = invoiceStatusFromOutstanding(input.grandTotal, input.outstanding);
  if (derived === "UNPAID" && input.currentStatus === "POSTED") {
    return "POSTED";
  }
  return derived;
}

export function purchaseStatusFromOutstanding(
  grandTotal: Money,
  outstanding: Money
): Extract<PurchaseStatus, "PAID" | "PARTIALLY_PAID" | "UNPAID"> {
  if (outstanding.amountMinor < 0n) {
    throw new Error("Purchase outstanding cannot be negative.");
  }
  if (outstanding.amountMinor === 0n) {
    return "PAID";
  }
  if (outstanding.amountMinor === grandTotal.amountMinor) {
    return "UNPAID";
  }
  return "PARTIALLY_PAID";
}

/**
 * Posted bills with no allocations stay POSTED (shown as unpaid).
 * After a payment, status becomes PARTIALLY_PAID or PAID.
 */
export function nextPurchasePaymentStatus(input: {
  currentStatus: PurchaseStatus;
  grandTotal: Money;
  outstanding: Money;
}): PurchaseStatus {
  const derived = purchaseStatusFromOutstanding(input.grandTotal, input.outstanding);
  if (derived === "UNPAID" && input.currentStatus === "POSTED") {
    return "POSTED";
  }
  return derived;
}
