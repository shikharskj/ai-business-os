import { NotificationError } from "@/modules/notifications/domain/errors";
import type { NotificationRepository } from "@/modules/notifications/domain/notification-repository";

export async function markNotificationRead(input: {
  tenantId: string;
  notificationId: string;
  notifications: NotificationRepository;
}): Promise<void> {
  const updated = await input.notifications.markRead({
    tenantId: input.tenantId,
    notificationId: input.notificationId,
  });
  if (!updated) {
    throw new NotificationError("Notification not found.");
  }
}

export async function markAllNotificationsRead(input: {
  tenantId: string;
  notifications: NotificationRepository;
}): Promise<number> {
  return input.notifications.markAllRead(input.tenantId);
}
