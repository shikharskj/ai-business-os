import type { PrismaClient } from "@/generated/prisma/client";

import type { NotificationRepository } from "@/modules/notifications/domain/notification-repository";
import type {
  NotificationChannelName,
  NotificationRecord,
  NotificationType,
} from "@/modules/notifications/domain/types";

type PrismaNotificationClient = Pick<PrismaClient, "notification">;

export function createPrismaNotificationRepository(
  prisma: PrismaNotificationClient
): NotificationRepository {
  return {
    async createIdempotent(input) {
      try {
        const record = await prisma.notification.create({
          data: {
            tenantId: input.tenantId,
            channel: input.channel,
            type: input.type,
            title: input.title,
            body: input.body,
            href: input.href ?? null,
            resourceType: input.resourceType ?? null,
            resourceId: input.resourceId ?? null,
            idempotencyKey: input.idempotencyKey,
          },
        });
        return { record: mapRecord(record), created: true };
      } catch (error) {
        if (isUniqueViolation(error)) {
          const existing = await prisma.notification.findUnique({
            where: {
              tenantId_idempotencyKey: {
                tenantId: input.tenantId,
                idempotencyKey: input.idempotencyKey,
              },
            },
          });
          if (existing) {
            return { record: mapRecord(existing), created: false };
          }
        }
        throw error;
      }
    },

    async listForTenant({ tenantId, limit = 30 }) {
      const rows = await prisma.notification.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(limit, 1), 100),
      });
      return rows.map(mapRecord);
    },

    async countUnread(tenantId) {
      return prisma.notification.count({
        where: { tenantId, readAt: null },
      });
    },

    async markRead({ tenantId, notificationId }) {
      const existing = await prisma.notification.findFirst({
        where: { id: notificationId, tenantId },
      });
      if (!existing) {
        return null;
      }
      if (existing.readAt) {
        return mapRecord(existing);
      }
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: { readAt: new Date() },
      });
      return mapRecord(updated);
    },

    async markAllRead(tenantId) {
      const result = await prisma.notification.updateMany({
        where: { tenantId, readAt: null },
        data: { readAt: new Date() },
      });
      return result.count;
    },
  };
}

function mapRecord(row: {
  id: string;
  tenantId: string;
  channel: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  resourceType: string | null;
  resourceId: string | null;
  idempotencyKey: string;
  readAt: Date | null;
  createdAt: Date;
}): NotificationRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    channel: row.channel as NotificationChannelName,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    href: row.href,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    idempotencyKey: row.idempotencyKey,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}
