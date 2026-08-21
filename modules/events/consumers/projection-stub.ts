import type { OutboxEventConsumer } from "@/modules/events/domain/types";

export const PROJECTION_STUB_CONSUMER_NAME = "projection-stub";

/**
 * No-op projection consumer kept for tests / isolated registration demos.
 * Default outbox registration uses `business-state` (spec 02) instead.
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
