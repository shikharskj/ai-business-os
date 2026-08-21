import type { PrismaClient } from "@/generated/prisma/client";

import type {
  OutboxDispatchRepository,
  OutboxEventRecord,
} from "@/modules/events/domain/types";

type PrismaOutboxClient = Pick<
  PrismaClient,
  "outboxEvent" | "outboxConsumerReceipt"
>;

export function createPrismaOutboxDispatchRepository(
  prisma: PrismaOutboxClient
): OutboxDispatchRepository {
  return {
    async listUnprocessedForConsumer({ consumerName, tenantId, limit }) {
      const take = Math.min(Math.max(limit, 1), 500);
      const rows = await prisma.outboxEvent.findMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
          receipts: {
            none: { consumerName },
          },
        },
        orderBy: { createdAt: "asc" },
        take,
      });
      return rows.map(mapEvent);
    },

    async recordReceipt({ eventId, consumerName }) {
      await prisma.outboxConsumerReceipt.upsert({
        where: {
          eventId_consumerName: { eventId, consumerName },
        },
        create: { eventId, consumerName },
        update: { processedAt: new Date() },
      });
    },

    async markEventFullyProcessed(eventId, consumerNames) {
      if (consumerNames.length === 0) {
        return;
      }
      const count = await prisma.outboxConsumerReceipt.count({
        where: {
          eventId,
          consumerName: { in: consumerNames },
        },
      });
      if (count >= consumerNames.length) {
        await prisma.outboxEvent.update({
          where: { id: eventId },
          data: { processedAt: new Date() },
        });
      }
    },
  };
}

function mapEvent(row: {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  createdAt: Date;
  processedAt: Date | null;
}): OutboxEventRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: row.createdAt,
    processedAt: row.processedAt,
  };
}
