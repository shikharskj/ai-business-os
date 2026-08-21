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
  /** Tenants that had outbox events in this pass (for overdue / follow-up scans). */
  tenantIdsTouched: string[];
};

/**
 * Dispatches committed outbox events to registered consumers independently.
 * Each consumer advances via its own receipts — one failing consumer does not
 * block others. Failures leave no receipt so the next pass can retry.
 * Never called inside the domain mutation transaction.
 *
 * Consumers with `handleBatch` receive one call per tenant group within the
 * fetched page (coalesce); others are invoked per event.
 */
export async function processOutboxConsumers(
  input: ProcessOutboxConsumersInput
): Promise<ProcessOutboxConsumersResult> {
  const consumers = input.consumers ?? listOutboxConsumers();
  // Legacy processedAt dual-write must require every *registered* consumer,
  // not just this dispatch subset — otherwise a notifications-only catch-up
  // could mark fully processed while projection consumers remain eligible.
  const registeredConsumerNames = listOutboxConsumers().map((c) => c.name);
  const limit = input.limit ?? 100;
  const stats: ConsumerProcessStats[] = [];
  let totalAttempted = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  const tenantIdsTouched = new Set<string>();

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

    if (consumer.handleBatch) {
      const groups = groupEventsByTenant(events);
      for (const group of groups) {
        for (const event of group) {
          tenantIdsTouched.add(event.tenantId);
        }

        const accepted: OutboxEventRecord[] = [];
        for (const event of group) {
          if (!consumerAcceptsEvent(consumer, event)) {
            await input.outbox.recordReceipt({
              eventId: event.id,
              consumerName: consumer.name,
            });
            consumerStats.skipped += 1;
            await maybeMarkFullyProcessed(
              input.outbox,
              registeredConsumerNames,
              event.id
            );
            continue;
          }
          accepted.push(event);
        }

        if (accepted.length === 0) {
          continue;
        }

        consumerStats.attempted += accepted.length;
        totalAttempted += accepted.length;

        try {
          const result = await consumer.handleBatch(accepted);
          for (const event of accepted) {
            await input.outbox.recordReceipt({
              eventId: event.id,
              consumerName: consumer.name,
            });
            await maybeMarkFullyProcessed(
              input.outbox,
              registeredConsumerNames,
              event.id
            );
          }
          if (result.handled) {
            consumerStats.succeeded += accepted.length;
            totalSucceeded += accepted.length;
          } else {
            consumerStats.skipped += accepted.length;
          }
        } catch (error) {
          consumerStats.failed += accepted.length;
          totalFailed += accepted.length;
          console.error(
            `Outbox consumer "${consumer.name}" failed on batch for tenant ${accepted[0]?.tenantId} (${accepted.length} events):`,
            error
          );
        }
      }
    } else {
      for (const event of events) {
        tenantIdsTouched.add(event.tenantId);

        if (!consumerAcceptsEvent(consumer, event)) {
          await input.outbox.recordReceipt({
            eventId: event.id,
            consumerName: consumer.name,
          });
          consumerStats.skipped += 1;
          await maybeMarkFullyProcessed(
            input.outbox,
            registeredConsumerNames,
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
            registeredConsumerNames,
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
    }

    stats.push(consumerStats);
  }

  return {
    consumers: stats,
    totalAttempted,
    totalSucceeded,
    totalFailed,
    tenantIdsTouched: [...tenantIdsTouched],
  };
}

/** Groups events by tenantId, preserving first-seen tenant order. */
function groupEventsByTenant(
  events: OutboxEventRecord[]
): OutboxEventRecord[][] {
  const order: string[] = [];
  const byTenant = new Map<string, OutboxEventRecord[]>();
  for (const event of events) {
    const existing = byTenant.get(event.tenantId);
    if (!existing) {
      order.push(event.tenantId);
      byTenant.set(event.tenantId, [event]);
    } else {
      existing.push(event);
    }
  }
  return order.map((tenantId) => byTenant.get(tenantId)!);
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
