import type {
  OutboxDispatchRepository,
  OutboxEventRecord,
} from "@/modules/events/domain/types";

export function createMemoryOutboxDispatchRepository(
  events: OutboxEventRecord[] = []
): OutboxDispatchRepository & {
  events: OutboxEventRecord[];
  receipts: Map<string, Set<string>>;
} {
  const receipts = new Map<string, Set<string>>();

  return {
    events,
    receipts,
    async listUnprocessedForConsumer({ consumerName, tenantId, limit }) {
      return events
        .filter((event) => {
          if (tenantId && event.tenantId !== tenantId) return false;
          const set = receipts.get(event.id);
          return !set?.has(consumerName);
        })
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, Math.min(Math.max(limit, 1), 500));
    },
    async recordReceipt({ eventId, consumerName }) {
      const set = receipts.get(eventId) ?? new Set<string>();
      set.add(consumerName);
      receipts.set(eventId, set);
    },
    async markEventFullyProcessed(eventId, consumerNames) {
      const set = receipts.get(eventId);
      if (!set) return;
      if (consumerNames.every((name) => set.has(name))) {
        const event = events.find((row) => row.id === eventId);
        if (event) {
          event.processedAt = new Date();
        }
      }
    },
  };
}
