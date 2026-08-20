import type {
  CreateNotificationInput,
  NotificationRecord,
} from "@/modules/notifications/domain/types";

export type NotificationRepository = {
  createIdempotent(
    input: CreateNotificationInput
  ): Promise<{ record: NotificationRecord; created: boolean }>;
  listForTenant(input: {
    tenantId: string;
    limit?: number;
  }): Promise<NotificationRecord[]>;
  countUnread(tenantId: string): Promise<number>;
  markRead(input: {
    tenantId: string;
    notificationId: string;
  }): Promise<NotificationRecord | null>;
  markAllRead(tenantId: string): Promise<number>;
};
