import type { NotificationRepository } from "@/modules/notifications/domain/notification-repository";
import type {
  CreateNotificationInput,
  NotificationRecord,
} from "@/modules/notifications/domain/types";
import type {
  NotificationContextRepository,
  OutboxConsumerRepository,
} from "@/modules/notifications/domain/outbox-consumer-repository";
import type {
  OutboxEventRecord,
  OverdueInvoiceCandidate,
} from "@/modules/notifications/domain/types";

export function createMemoryNotificationRepository(): NotificationRepository & {
  records: NotificationRecord[];
} {
  const records: NotificationRecord[] = [];

  return {
    records,
    async createIdempotent(input: CreateNotificationInput) {
      const existing = records.find(
        (row) =>
          row.tenantId === input.tenantId &&
          row.idempotencyKey === input.idempotencyKey
      );
      if (existing) {
        return { record: existing, created: false };
      }
      const record: NotificationRecord = {
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        channel: input.channel,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        idempotencyKey: input.idempotencyKey,
        readAt: null,
        createdAt: new Date(),
      };
      records.push(record);
      return { record, created: true };
    },

    async listForTenant({ tenantId, limit = 30 }) {
      return records
        .filter((row) => row.tenantId === tenantId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async countUnread(tenantId) {
      return records.filter(
        (row) => row.tenantId === tenantId && row.readAt === null
      ).length;
    },

    async markRead({ tenantId, notificationId }) {
      const record = records.find(
        (row) => row.id === notificationId && row.tenantId === tenantId
      );
      if (!record) return null;
      if (!record.readAt) {
        record.readAt = new Date();
      }
      return record;
    },

    async markAllRead(tenantId) {
      let count = 0;
      for (const record of records) {
        if (record.tenantId === tenantId && !record.readAt) {
          record.readAt = new Date();
          count += 1;
        }
      }
      return count;
    },
  };
}

export function createMemoryOutboxConsumerRepository(
  events: OutboxEventRecord[] = []
): OutboxConsumerRepository & {
  events: OutboxEventRecord[];
  processedIds: Set<string>;
} {
  const processedIds = new Set<string>();
  return {
    events,
    processedIds,
    async listUnprocessed({ tenantId, limit }) {
      return events
        .filter(
          (event) =>
            !processedIds.has(event.id) &&
            (!tenantId || event.tenantId === tenantId)
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, limit);
    },
    async markProcessed(eventId) {
      processedIds.add(eventId);
    },
  };
}

export function createMemoryNotificationContextRepository(input?: {
  timezones?: Record<string, string>;
  thresholds?: Record<string, string>;
  products?: Record<
    string,
    { name: string; sku: string; quantityMajor: string }
  >;
  overdue?: Record<string, OverdueInvoiceCandidate[]>;
}): NotificationContextRepository {
  const timezones = input?.timezones ?? {};
  const thresholds = input?.thresholds ?? {};
  const products = input?.products ?? {};
  const overdue = input?.overdue ?? {};

  return {
    async getBusinessTimezone(tenantId) {
      return timezones[tenantId] ?? "Asia/Kolkata";
    },
    async getLowStockThresholdMajor(tenantId) {
      return thresholds[tenantId] ?? "5.0000";
    },
    async getProductLabel({ tenantId, productId }) {
      const key = `${tenantId}:${productId}`;
      const product = products[key];
      return product ? { name: product.name, sku: product.sku } : null;
    },
    async getProductStockQuantityMajor({ tenantId, productId }) {
      const key = `${tenantId}:${productId}`;
      return products[key]?.quantityMajor ?? null;
    },
    async listOverdueInvoices({ tenantId }) {
      return overdue[tenantId] ?? [];
    },
  };
}
