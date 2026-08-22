import { ensureOutboxConsumer } from "@/modules/events/application/process-outbox";
import { unregisterOutboxConsumer } from "@/modules/events/application/registry";
import { createNotificationsOutboxConsumer } from "@/modules/events/consumers/notifications-consumer";
import {
  createBusinessStateOutboxConsumer,
  type BusinessStateConsumerDeps,
} from "@/modules/business-state/consumers/business-state-consumer";
import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";
import {
  AUTOMATION_CONSUMER_NAME,
  createAutomationOutboxConsumer,
  registerDefaultWorkflows,
  type AutomationConsumerDeps,
} from "@/modules/workflows";

export type DefaultOutboxConsumerDeps = {
  channel: NotificationChannel;
  context: NotificationContextRepository;
  businessState: BusinessStateConsumerDeps;
  automation?: AutomationConsumerDeps;
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
  if (deps.automation) {
    registerDefaultWorkflows();
    ensureOutboxConsumer(createAutomationOutboxConsumer(deps.automation));
  } else {
    unregisterOutboxConsumer(AUTOMATION_CONSUMER_NAME);
  }
}
