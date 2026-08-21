import type { OutboxEventConsumer } from "@/modules/events/domain/types";

export const PROJECTION_STUB_CONSUMER_NAME = "projection-stub";

/**
 * No-op projection consumer that proves multi-consumer registration.
 * Spec 02 will replace this with real BusinessState writers.
 * Side effects are intentionally empty; receipts + call counts prove idempotency.
 */
export function createProjectionStubConsumer(input?: {
  onHandle?: (eventId: string, eventType: string) => void;
  handledEventIds?: Set<string>;
}): OutboxEventConsumer {
  const handledEventIds = input?.handledEventIds ?? new Set<string>();

  return {
    name: PROJECTION_STUB_CONSUMER_NAME,
    async handle(event) {
      input?.onHandle?.(event.id, event.eventType);
      // Idempotent natural key: same event id is only "applied" once in-memory.
      if (handledEventIds.has(event.id)) {
        return { handled: false };
      }
      handledEventIds.add(event.id);
      return { handled: true };
    },
  };
}
