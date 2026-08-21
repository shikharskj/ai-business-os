import type { DomainEventType } from "@/modules/events/catalog";

export type OutboxEventRecord = {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  processedAt: Date | null;
};

export type OutboxConsumerHandleResult = {
  /** When false, event was ignored by this consumer (still records a receipt). */
  handled: boolean;
};

/**
 * Idempotent outbox consumer. May be invoked more than once for the same
 * event; side effects must use natural keys / receipts.
 */
export type OutboxEventConsumer = {
  /** Stable name used for OutboxConsumerReceipt rows. */
  name: string;
  /**
   * Event types this consumer cares about. Empty / omit = all events
   * (consumer should no-op quickly for irrelevant types).
   */
  eventTypes?: ReadonlyArray<DomainEventType | string>;
  handle(event: OutboxEventRecord): Promise<OutboxConsumerHandleResult>;
};

export type OutboxDispatchRepository = {
  listUnprocessedForConsumer(input: {
    consumerName: string;
    tenantId?: string;
    limit: number;
  }): Promise<OutboxEventRecord[]>;
  /**
   * Records that this consumer finished (success or intentional skip).
   * Must be idempotent on (eventId, consumerName).
   */
  recordReceipt(input: {
    eventId: string;
    consumerName: string;
  }): Promise<void>;
  /**
   * Dual-write legacy processedAt when every named consumer has a receipt.
   */
  markEventFullyProcessed?(
    eventId: string,
    consumerNames: string[]
  ): Promise<void>;
};
