import {
  listOutboxConsumers,
  registerOutboxConsumer,
} from "@/modules/events/application/registry";
import type {
  OutboxDispatchRepository,
  OutboxEventConsumer,
  OutboxEventRecord,
} from "@/modules/events/domain/types";

export type ProcessOutboxConsumersInput = {
  outbox: OutboxDispatchRepository;
  /** Defaults to all registered consumers. */
  consumers?: OutboxEventConsumer[];
  tenantId?: string;
  limit?: number;
};

export type ConsumerProcessStats = {
  consumerName: string;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

export type ProcessOutboxConsumersResult = {
  consumers: ConsumerProcessStats[];
  totalAttempted: number;
  totalSucceeded: number;
  totalFailed: number;
};

/**
 * Dispatches committed outbox events to registered consumers independently.
 * Each consumer advances via its own receipts — one failing consumer does not
 * block others. Failures leave no receipt so the next pass can retry.
 * Never called inside the domain mutation transaction.
 */
export async function processOutboxConsumers(
  input: ProcessOutboxConsumersInput
): Promise<ProcessOutboxConsumersResult> {
  const consumers = input.consumers ?? listOutboxConsumers();
  const limit = input.limit ?? 100;
  const stats: ConsumerProcessStats[] = [];
  let totalAttempted = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;

  for (const consumer of consumers) {
    const consumerStats: ConsumerProcessStats = {
      consumerName: consumer.name,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };

    const events = await input.outbox.listUnprocessedForConsumer({
      consumerName: consumer.name,
      tenantId: input.tenantId,
      limit,
    });

    for (const event of events) {
      if (!consumerAcceptsEvent(consumer, event)) {
        await input.outbox.recordReceipt({
          eventId: event.id,
          consumerName: consumer.name,
        });
        consumerStats.skipped += 1;
        await maybeMarkFullyProcessed(
          input.outbox,
          consumers.map((c) => c.name),
          event.id
        );
        continue;
      }

      consumerStats.attempted += 1;
      totalAttempted += 1;

      try {
        const result = await consumer.handle(event);
        await input.outbox.recordReceipt({
          eventId: event.id,
          consumerName: consumer.name,
        });
        if (result.handled) {
          consumerStats.succeeded += 1;
          totalSucceeded += 1;
        } else {
          consumerStats.skipped += 1;
        }
        await maybeMarkFullyProcessed(
          input.outbox,
          consumers.map((c) => c.name),
          event.id
        );
      } catch (error) {
        consumerStats.failed += 1;
        totalFailed += 1;
        console.error(
          `Outbox consumer "${consumer.name}" failed on event ${event.id} (${event.eventType}):`,
          error
        );
      }
    }

    stats.push(consumerStats);
  }

  return {
    consumers: stats,
    totalAttempted,
    totalSucceeded,
    totalFailed,
  };
}

function consumerAcceptsEvent(
  consumer: OutboxEventConsumer,
  event: OutboxEventRecord
): boolean {
  if (!consumer.eventTypes || consumer.eventTypes.length === 0) {
    return true;
  }
  return consumer.eventTypes.includes(event.eventType);
}

async function maybeMarkFullyProcessed(
  outbox: OutboxDispatchRepository,
  consumerNames: string[],
  eventId: string
): Promise<void> {
  if (!outbox.markEventFullyProcessed || consumerNames.length === 0) {
    return;
  }
  try {
    await outbox.markEventFullyProcessed(eventId, consumerNames);
  } catch {
    // Non-critical dual-write.
  }
}

/** Ensures a consumer is registered (idempotent replace by name). */
export function ensureOutboxConsumer(consumer: OutboxEventConsumer): void {
  registerOutboxConsumer(consumer);
}
