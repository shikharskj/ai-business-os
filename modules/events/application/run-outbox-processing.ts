import { processOutboxConsumers } from "@/modules/events/application/process-outbox";
import { registerDefaultOutboxConsumers } from "@/modules/events/application/register-default-consumers";
import type { OutboxDispatchRepository } from "@/modules/events/domain/types";
import type { BusinessStateConsumerDeps } from "@/modules/business-state/consumers/business-state-consumer";
import { BUSINESS_STATE_CONSUMER_NAME } from "@/modules/business-state/consumers/business-state-consumer";
import { rebuildBusinessStateProjections } from "@/modules/business-state/application/rebuild";
import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";
import { checkOverdueInvoices } from "@/modules/notifications/application/process-outbox";

export type RunOutboxProcessingInput = {
  outbox: OutboxDispatchRepository;
  channel: NotificationChannel;
  context: NotificationContextRepository;
  businessState: BusinessStateConsumerDeps;
  tenantId?: string;
  overdueTenantIds?: string[];
  limit?: number;
  includeOverdueCheck?: boolean;
};

export type RunOutboxProcessingResult = {
  processedEvents: number;
  notificationsCreated: number;
  businessStateHandled: number;
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
    businessState: input.businessState,
  });

  const dispatch = await processOutboxConsumers({
    outbox: input.outbox,
    tenantId: input.tenantId,
    limit: input.limit,
  });

  const notificationsStats = dispatch.consumers.find(
    (row) => row.consumerName === "notifications"
  );
  const businessStateStats = dispatch.consumers.find(
    (row) => row.consumerName === BUSINESS_STATE_CONSUMER_NAME
  );

  let overdueChecked = 0;
  if (input.includeOverdueCheck !== false) {
    const tenantIds = new Set<string>(dispatch.tenantIdsTouched);
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
      const tenantContext =
        await input.businessState.resolveTenantContext(tenantId);
      if (!tenantContext) continue;
      await rebuildBusinessStateProjections({
        tenantId,
        timezone: tenantContext.timezone,
        lowStockThresholdMajor: tenantContext.lowStockThresholdMajor,
        currency: tenantContext.currency,
        sales: input.businessState.sales,
        payments: input.businessState.payments,
        catalog: input.businessState.catalog,
        inventory: input.businessState.inventory,
        accounts: input.businessState.accounts,
        journals: input.businessState.journals,
        projections: input.businessState.projections,
        attention: input.businessState.attention,
        families: ["attentionQueue"],
      });
    }
  }

  return {
    processedEvents:
      dispatch.totalAttempted +
      dispatch.consumers.reduce((sum, row) => sum + row.skipped, 0),
    notificationsCreated: notificationsStats?.succeeded ?? 0,
    businessStateHandled: businessStateStats?.succeeded ?? 0,
    overdueChecked,
    consumerFailures: dispatch.totalFailed,
  };
}
