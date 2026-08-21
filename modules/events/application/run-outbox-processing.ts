import { processOutboxConsumers } from "@/modules/events/application/process-outbox";
import { registerDefaultOutboxConsumers } from "@/modules/events/application/register-default-consumers";
import type { OutboxDispatchRepository } from "@/modules/events/domain/types";
import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";
import { checkOverdueInvoices } from "@/modules/notifications/application/process-outbox";

export type RunOutboxProcessingInput = {
  outbox: OutboxDispatchRepository;
  channel: NotificationChannel;
  context: NotificationContextRepository;
  tenantId?: string;
  overdueTenantIds?: string[];
  limit?: number;
  includeOverdueCheck?: boolean;
};

export type RunOutboxProcessingResult = {
  processedEvents: number;
  notificationsCreated: number;
  projectionStubHandled: number;
  overdueChecked: number;
  consumerFailures: number;
};

/**
 * Full post-commit outbox pass: register default consumers, fan-out,
 * then optional overdue notification scan (not outbox-driven).
 */
export async function runOutboxProcessing(
  input: RunOutboxProcessingInput
): Promise<RunOutboxProcessingResult> {
  registerDefaultOutboxConsumers({
    channel: input.channel,
    context: input.context,
  });

  const dispatch = await processOutboxConsumers({
    outbox: input.outbox,
    tenantId: input.tenantId,
    limit: input.limit,
  });

  const notificationsStats = dispatch.consumers.find(
    (row) => row.consumerName === "notifications"
  );
  const projectionStats = dispatch.consumers.find(
    (row) => row.consumerName === "projection-stub"
  );

  let overdueChecked = 0;
  if (input.includeOverdueCheck !== false) {
    const tenantIds = new Set<string>();
    if (input.tenantId) {
      tenantIds.add(input.tenantId);
    }
    for (const id of input.overdueTenantIds ?? []) {
      tenantIds.add(id);
    }
    for (const tenantId of tenantIds) {
      overdueChecked += await checkOverdueInvoices({
        tenantId,
        channel: input.channel,
        context: input.context,
      });
    }
  }

  return {
    processedEvents: dispatch.totalAttempted + dispatch.consumers.reduce(
      (sum, row) => sum + row.skipped,
      0
    ),
    notificationsCreated: notificationsStats?.succeeded ?? 0,
    projectionStubHandled: projectionStats?.succeeded ?? 0,
    overdueChecked,
    consumerFailures: dispatch.totalFailed,
  };
}
