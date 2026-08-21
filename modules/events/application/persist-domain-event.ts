/**
 * Typed persist helper: validates known payload shapes when a catalog schema exists.
 * Still writes through the shared-kernel outbox in the same DB transaction.
 */
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  parseDomainEventPayload,
  type DomainOutboxEventInput,
} from "@/modules/events/catalog";

export async function persistDomainEvent(
  outbox: OutboxRepository,
  input: DomainOutboxEventInput
): Promise<{ id: string }> {
  const payload = parseDomainEventPayload(input.eventType, input.payload);
  return outbox.persist({
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload,
    correlationId: input.correlationId,
  });
}
