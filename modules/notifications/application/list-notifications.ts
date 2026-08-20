import type { NotificationRepository } from "@/modules/notifications/domain/notification-repository";
import type {
  NotificationListItem,
  NotificationListResponse,
} from "@/modules/notifications/domain/types";

export async function listNotifications(input: {
  tenantId: string;
  limit?: number;
  notifications: NotificationRepository;
}): Promise<NotificationListResponse> {
  const [rows, unreadCount] = await Promise.all([
    input.notifications.listForTenant({
      tenantId: input.tenantId,
      limit: input.limit ?? 30,
    }),
    input.notifications.countUnread(input.tenantId),
  ]);

  const notifications: NotificationListItem[] = rows
    .filter((row) => row.tenantId === input.tenantId)
    .map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      href: row.href,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    }));

  return { unreadCount, notifications };
}
