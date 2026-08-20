import type {
  CreateNotificationInput,
  NotificationChannelName,
  NotificationRecord,
} from "@/modules/notifications/domain/types";

/**
 * Delivery channel abstraction. MVP implements IN_APP only;
 * email / SMS / WhatsApp can plug in here later without changing producers.
 */
export type NotificationChannel = {
  readonly name: NotificationChannelName;
  deliver(input: CreateNotificationInput): Promise<NotificationRecord | null>;
};
