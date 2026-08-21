import { ensureOutboxConsumer } from "@/modules/events/application/process-outbox";
import { createNotificationsOutboxConsumer } from "@/modules/events/consumers/notifications-consumer";
import { createProjectionStubConsumer } from "@/modules/events/consumers/projection-stub";
import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";

export type DefaultOutboxConsumerDeps = {
  channel: NotificationChannel;
  context: NotificationContextRepository;
};

/**
 * Registers built-in consumers for the process pass.
 * Safe to call on every cron / after() invocation (replace-by-name).
 */
export function registerDefaultOutboxConsumers(
  deps: DefaultOutboxConsumerDeps
): void {
  ensureOutboxConsumer(createNotificationsOutboxConsumer(deps));
  ensureOutboxConsumer(createProjectionStubConsumer());
}
