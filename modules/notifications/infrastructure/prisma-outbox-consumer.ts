import type { PrismaClient } from "@/generated/prisma/client";

import type { OutboxConsumerRepository } from "@/modules/notifications/domain/outbox-consumer-repository";
import type { OutboxEventRecord } from "@/modules/notifications/domain/types";

type PrismaOutboxClient = Pick<PrismaClient, "outboxEvent">;

export function createPrismaOutboxConsumerRepository(
  prisma: PrismaOutboxClient
): OutboxConsumerRepository {
  return {
    async listUnprocessed({ tenantId, limit }) {
      const rows = await prisma.outboxEvent.findMany({
        where: {
          processedAt: null,
          ...(tenantId ? { tenantId } : {}),
        },
        orderBy: { createdAt: "asc" },
        take: Math.min(Math.max(limit, 1), 500),
      });
      return rows.map(mapEvent);
    },

    async markProcessed(eventId) {
      await prisma.outboxEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date() },
      });
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
  };
}
