import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import { overdueNotificationDraft } from "@/modules/notifications/domain/event-mapping";
import { deliverNotificationFromOutboxEvent } from "@/modules/notifications/application/deliver-from-outbox";
import type { NotificationRepository } from "@/modules/notifications/domain/notification-repository";
import type {
  NotificationContextRepository,
  OutboxConsumerRepository,
} from "@/modules/notifications/domain/outbox-consumer-repository";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

export type ProcessOutboxDeps = {
  outbox: OutboxConsumerRepository;
  notifications: NotificationRepository;
  context: NotificationContextRepository;
  channel: NotificationChannel;
  tenantId?: string;
  /** When set (global cron), overdue scan covers these tenants even with no events. */
  overdueTenantIds?: string[];
  limit?: number;
  includeOverdueCheck?: boolean;
};

export type ProcessOutboxResult = {
  processedEvents: number;
  notificationsCreated: number;
  overdueChecked: number;
};

/**
 * Legacy single-consumer path (notifications-only) for unit tests and
 * callers that inject OutboxConsumerRepository.
 * Production cron / after() should prefer `runOutboxProcessing` from
 * `@/modules/events` so all registered consumers run.
 *
 * Failures here must not roll back the original business transaction
 * (this always runs after commit). Duplicate delivery is safe via
 * idempotency keys.
 */
export async function processOutboxNotifications(
  input: ProcessOutboxDeps
): Promise<ProcessOutboxResult> {
  const events = await input.outbox.listUnprocessed({
    tenantId: input.tenantId,
    limit: input.limit ?? 100,
  });

  let notificationsCreated = 0;
  const tenantsTouched = new Set<string>();

  for (const event of events) {
    tenantsTouched.add(event.tenantId);
    try {
      const created = await deliverNotificationFromOutboxEvent({
        event,
        channel: input.channel,
        context: input.context,
      });
      if (created) {
        notificationsCreated += 1;
      }
      await input.outbox.markProcessed(event.id);
    } catch (error) {
      // Leave unprocessed for retry (do not mark on failure).
      console.error(
        `Failed to process outbox event ${event.id} (${event.eventType}):`,
        error
      );
    }
  }

  let overdueChecked = 0;
  if (input.includeOverdueCheck !== false) {
    const tenantIds = new Set<string>(tenantsTouched);
    if (input.tenantId) {
      tenantIds.add(input.tenantId);
    }
    for (const id of input.overdueTenantIds ?? []) {
      tenantIds.add(id);
    }
    for (const tenantId of tenantIds) {
      overdueChecked += await emitOverdueNotifications({
        tenantId,
        channel: input.channel,
        context: input.context,
      });
    }
  }

  return {
    processedEvents: events.length,
    notificationsCreated,
    overdueChecked,
  };
}

async function emitOverdueNotifications(input: {
  tenantId: string;
  channel: NotificationChannel;
  context: NotificationContextRepository;
}): Promise<number> {
  const timezone = await input.context.getBusinessTimezone(input.tenantId);
  if (!timezone) {
    return 0;
  }

  const asOfDate = todayInTimezone(timezone);
  const overdue = await input.context.listOverdueInvoices({
    tenantId: input.tenantId,
    asOfDate,
  });

  let created = 0;
  for (const invoice of overdue) {
    const delivered = await input.channel.deliver(
      overdueNotificationDraft({
        tenantId: input.tenantId,
        invoice,
      })
    );
    if (delivered) {
      created += 1;
    }
  }
  return created;
}

/**
 * Runs an overdue scan for a single tenant (scheduled / on-demand).
 */
export async function checkOverdueInvoices(input: {
  tenantId: string;
  channel: NotificationChannel;
  context: NotificationContextRepository;
}): Promise<number> {
  return emitOverdueNotifications(input);
}
