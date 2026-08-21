import type { OutboxEventConsumer } from "@/modules/events/domain/types";
import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";
import { deliverNotificationFromOutboxEvent } from "@/modules/notifications/application/deliver-from-outbox";

export const NOTIFICATIONS_CONSUMER_NAME = "notifications";

const NOTIFICATION_EVENT_TYPES = [
  "SalesInvoiceCreated",
  "SalesInvoicePosted",
  "PaymentReceived",
  "InventoryOpened",
  "InventoryAdjusted",
  "InventoryMoved",
] as const;

export function createNotificationsOutboxConsumer(input: {
  channel: NotificationChannel;
  context: NotificationContextRepository;
}): OutboxEventConsumer {
  return {
    name: NOTIFICATIONS_CONSUMER_NAME,
    eventTypes: [...NOTIFICATION_EVENT_TYPES],
    async handle(event) {
      const created = await deliverNotificationFromOutboxEvent({
        event,
        channel: input.channel,
        context: input.context,
      });
      return { handled: created };
    },
  };
}
