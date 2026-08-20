import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import {
  draftFromOutboxEvent,
  lowStockNotificationDraft,
  overdueNotificationDraft,
} from "@/modules/notifications/domain/event-mapping";
import type { NotificationRepository } from "@/modules/notifications/domain/notification-repository";
import type {
  NotificationContextRepository,
  OutboxConsumerRepository,
} from "@/modules/notifications/domain/outbox-consumer-repository";
import { isLowStock } from "@/modules/inventory/domain/stock";
import { parseLowStockThreshold } from "@/modules/inventory/application/stock";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
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
 * Consumes committed outbox events and delivers in-app notifications.
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
    const created = await handleOutboxEvent({
      event,
      channel: input.channel,
      context: input.context,
    });
    if (created) {
      notificationsCreated += 1;
    }
    await input.outbox.markProcessed(event.id);
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

async function handleOutboxEvent(input: {
  event: Parameters<typeof draftFromOutboxEvent>[0];
  channel: NotificationChannel;
  context: NotificationContextRepository;
}): Promise<boolean> {
  const draft = draftFromOutboxEvent(input.event);
  if (!draft) {
    return false;
  }

  if (draft !== "check_low_stock") {
    const delivered = await input.channel.deliver(draft);
    return delivered !== null;
  }

  const productId = input.event.aggregateId;
  const label = await input.context.getProductLabel({
    tenantId: input.event.tenantId,
    productId,
  });
  if (!label) {
    return false;
  }

  const quantityMajor = await input.context.getProductStockQuantityMajor({
    tenantId: input.event.tenantId,
    productId,
  });
  if (quantityMajor === null) {
    return false;
  }

  const thresholdMajor = await input.context.getLowStockThresholdMajor(
    input.event.tenantId
  );
  const threshold = parseLowStockThreshold(thresholdMajor);
  const quantity = quantityFromMajor(quantityMajor);
  if (!isLowStock(quantity, threshold)) {
    return false;
  }

  const delivered = await input.channel.deliver(
    lowStockNotificationDraft({
      tenantId: input.event.tenantId,
      productId,
      productName: label.name,
      sku: label.sku,
      quantityMajor,
      outboxEventId: input.event.id,
    })
  );
  return delivered !== null;
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
