export type {
  CreateNotificationInput,
  NotificationChannelName,
  NotificationListItem,
  NotificationListResponse,
  NotificationRecord,
  NotificationType,
  OutboxEventRecord,
  OverdueInvoiceCandidate,
} from "@/modules/notifications/domain/types";
export {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
} from "@/modules/notifications/domain/types";
export type { NotificationChannel } from "@/modules/notifications/domain/channel";
export { NotificationError } from "@/modules/notifications/domain/errors";
export type { NotificationRepository } from "@/modules/notifications/domain/notification-repository";
export type {
  NotificationContextRepository,
  OutboxConsumerRepository,
} from "@/modules/notifications/domain/outbox-consumer-repository";
export {
  draftFromOutboxEvent,
  lowStockNotificationDraft,
  overdueNotificationDraft,
} from "@/modules/notifications/domain/event-mapping";
export { listNotifications } from "@/modules/notifications/application/list-notifications";
export {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/application/mark-read";
export {
  checkOverdueInvoices,
  processOutboxNotifications,
} from "@/modules/notifications/application/process-outbox";
export { scheduleNotificationOutboxProcessing } from "@/modules/notifications/application/schedule-processing";
export { createInAppChannel } from "@/modules/notifications/infrastructure/in-app-channel";
export { createPrismaNotificationRepository } from "@/modules/notifications/infrastructure/prisma-notification-repository";
export { createPrismaOutboxConsumerRepository } from "@/modules/notifications/infrastructure/prisma-outbox-consumer";
export { createPrismaNotificationContextRepository } from "@/modules/notifications/infrastructure/prisma-notification-context";
export {
  createMemoryNotificationContextRepository,
  createMemoryNotificationRepository,
  createMemoryOutboxConsumerRepository,
} from "@/modules/notifications/infrastructure/memory-notification-repository";
export { markNotificationsSchema } from "@/modules/notifications/schemas/notification.schema";
