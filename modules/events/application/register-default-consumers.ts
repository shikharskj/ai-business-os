import { ensureOutboxConsumer } from "@/modules/events/application/process-outbox";
import { createNotificationsOutboxConsumer } from "@/modules/events/consumers/notifications-consumer";
import {
  createBusinessStateOutboxConsumer,
  type BusinessStateConsumerDeps,
} from "@/modules/business-state/consumers/business-state-consumer";
import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";

export type DefaultOutboxConsumerDeps = {
  channel: NotificationChannel;
  context: NotificationContextRepository;
  businessState: BusinessStateConsumerDeps;
};

/**
 * Registers built-in consumers for the process pass.
 * Safe to call on every cron / after() invocation (replace-by-name).
 */
export function registerDefaultOutboxConsumers(
  deps: DefaultOutboxConsumerDeps
): void {
  ensureOutboxConsumer(createNotificationsOutboxConsumer(deps));
  ensureOutboxConsumer(createBusinessStateOutboxConsumer(deps.businessState));
}
