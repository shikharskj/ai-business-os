import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import {
  draftFromOutboxEvent,
  lowStockNotificationDraft,
} from "@/modules/notifications/domain/event-mapping";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";
import type { OutboxEventRecord } from "@/modules/notifications/domain/types";
import { isLowStock } from "@/modules/inventory/domain/stock";
import { parseLowStockThreshold } from "@/modules/inventory/application/stock";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";

/**
 * Maps one outbox event to at most one in-app notification delivery.
 * Idempotent via notification idempotency keys (outbox:eventId).
 */
export async function deliverNotificationFromOutboxEvent(input: {
  event: OutboxEventRecord;
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
