import type { OutboxEventRecord } from "@/modules/events/domain/types";
import {
  COLLECTIONS_REMIND_WORKFLOW_ID,
  COLLECTIONS_REMINDER_COOLDOWN_DAYS,
} from "@/modules/workflows/domain/types";

export function collectionsRemindIdempotencyKey(
  invoiceId: string,
  asOf: string
): string {
  return `${COLLECTIONS_REMIND_WORKFLOW_ID}:${invoiceId}:${asOf}`;
}

export function collectionsConcurrencyKey(invoiceId: string): string {
  return `${COLLECTIONS_REMIND_WORKFLOW_ID}:${invoiceId}`;
}

export function payloadString(
  payload: Record<string, unknown>,
  key: string
): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function invoiceOverdueAsOf(event: OutboxEventRecord): string | null {
  return payloadString(event.payload, "asOf");
}

export function collectionsCooldownMs(
  days: number = COLLECTIONS_REMINDER_COOLDOWN_DAYS
): number {
  return days * 86_400_000;
}
