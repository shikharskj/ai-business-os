import type { AttentionItemType } from "@/modules/business-state/domain/types";

export function overdueReceivableNaturalKey(invoiceId: string): string {
  return `overdue-receivable:${invoiceId}`;
}

export function lowStockNaturalKey(productId: string): string {
  return `low-stock:${productId}`;
}

export function idleQuotationNaturalKey(quotationId: string): string {
  return `idle-quotation:${quotationId}`;
}

export function attentionFactId(
  type: AttentionItemType,
  resourceId: string
): string {
  return `attention:${type.toLowerCase().replaceAll("_", "-")}:${resourceId}`;
}

export function dismissOutcomeIdempotencyKey(attentionItemId: string): string {
  return `attention-dismissed:${attentionItemId}`;
}

export function reminderProposedIdempotencyKey(
  invoiceId: string,
  asOf: string
): string {
  return `reminder-proposed:${invoiceId}:${asOf}`;
}

export function reminderSentIdempotencyKey(
  invoiceId: string,
  asOf: string
): string {
  return `reminder-sent:${invoiceId}:${asOf}`;
}

export function paidAfterReminderIdempotencyKey(
  invoiceId: string,
  paymentId: string
): string {
  return `paid-after-reminder:${invoiceId}:${paymentId}`;
}
