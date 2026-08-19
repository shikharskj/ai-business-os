import type { PrismaClient } from "@/generated/prisma/client";

export type OutboxEventInput = {
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
};

export type OutboxRepository = {
  persist(input: OutboxEventInput): Promise<{ id: string }>;
};

/**
 * Creates an outbox repository that writes events using the provided
 * Prisma client (or transaction client). Pass a `$transaction` client
 * to ensure the event is written in the same transaction as the
 * domain mutation.
 */
export function createPrismaOutboxRepository(
  prisma: PrismaClient
): OutboxRepository {
  return {
    async persist(input) {
      const event = await prisma.outboxEvent.create({
        data: {
          tenantId: input.tenantId,
          eventType: input.eventType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          payload: input.payload as object,
          correlationId: input.correlationId ?? null,
        },
      });
      return { id: event.id };
    },
  };
}

export function createMemoryOutboxRepository(): OutboxRepository & {
  events: OutboxEventInput[];
} {
  const events: OutboxEventInput[] = [];
  return {
    events,
    async persist(input) {
      events.push(input);
      return { id: crypto.randomUUID() };
    },
  };
}
