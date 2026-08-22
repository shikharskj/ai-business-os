import type { OutboxEventRecord } from "@/modules/events/domain/types";
import {
  EXPENSE_ANOMALY_WORKFLOW_ID,
  QUOTATION_FOLLOW_UP_WORKFLOW_ID,
  REORDER_PREPARE_WORKFLOW_ID,
} from "@/modules/workflows/domain/types";

export function quotationFollowUpIdempotencyKey(
  quotationId: string,
  asOf: string
): string {
  return `${QUOTATION_FOLLOW_UP_WORKFLOW_ID}:${quotationId}:${asOf}`;
}

export function quotationFollowUpConcurrencyKey(quotationId: string): string {
  return `${QUOTATION_FOLLOW_UP_WORKFLOW_ID}:${quotationId}`;
}

export function reorderPrepareIdempotencyKey(
  productId: string,
  asOf: string
): string {
  return `${REORDER_PREPARE_WORKFLOW_ID}:${productId}:${asOf}`;
}

export function reorderPrepareConcurrencyKey(productId: string): string {
  return `${REORDER_PREPARE_WORKFLOW_ID}:${productId}`;
}

export function expenseAnomalyIdempotencyKey(expenseId: string): string {
  return `${EXPENSE_ANOMALY_WORKFLOW_ID}:${expenseId}`;
}

export function expenseAnomalyConcurrencyKey(expenseId: string): string {
  return `${EXPENSE_ANOMALY_WORKFLOW_ID}:${expenseId}`;
}

export function payloadString(
  payload: Record<string, unknown>,
  key: string
): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function expansionAsOf(event: OutboxEventRecord): string | null {
  return payloadString(event.payload, "asOf");
}
