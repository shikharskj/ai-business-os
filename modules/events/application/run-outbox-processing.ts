import { rebuildBusinessStateProjections } from "@/modules/business-state/application/rebuild";
import { IDLE_QUOTATION_DAYS } from "@/modules/business-state/domain/types";
import { BUSINESS_STATE_CONSUMER_NAME } from "@/modules/business-state/consumers/business-state-consumer";
import type { BusinessStateConsumerDeps } from "@/modules/business-state/consumers/business-state-consumer";
import { processOutboxConsumers } from "@/modules/events/application/process-outbox";
import { registerDefaultOutboxConsumers } from "@/modules/events/application/register-default-consumers";
import type { OutboxDispatchRepository } from "@/modules/events/domain/types";
import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import { checkOverdueInvoices } from "@/modules/notifications/application/process-outbox";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";
import {
  listLowStockProducts,
  parseLowStockThreshold,
  toQuantityMajorString,
} from "@/modules/inventory";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { AUTOMATION_CONSUMER_NAME } from "@/modules/workflows/consumers/automation-consumer";
import { emitInvoiceOverdueEvents } from "@/modules/workflows/application/emit-invoice-overdue";
import { emitQuotationIdleEvents } from "@/modules/workflows/application/emit-quotation-idle";
import { emitStockLowEvents } from "@/modules/workflows/application/emit-stock-low";
import { processDueWorkflowRuns } from "@/modules/workflows/application/process-runs";
import type { ExecuteWorkflowRunDeps } from "@/modules/workflows/application/runner";

export type RunOutboxProcessingInput = {
  outbox: OutboxDispatchRepository;
  channel: NotificationChannel;
  context: NotificationContextRepository;
  businessState: BusinessStateConsumerDeps;
  automation?: ExecuteWorkflowRunDeps;
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
  automationEnqueued: number;
  automationSucceeded: number;
  automationFailed: number;
  automationSkipped: number;
};

/**
 * Full post-commit outbox pass: register default consumers, fan-out,
 * overdue scan (notifications + attention + InvoiceOverdue / QuotationIdle /
 * StockLow), then due automation jobs so collections and expansions can run
 * in the same pass.
 */
export async function runOutboxProcessing(
  input: RunOutboxProcessingInput
): Promise<RunOutboxProcessingResult> {
  registerDefaultOutboxConsumers({
    channel: input.channel,
    context: input.context,
    businessState: input.businessState,
    automation: input.automation
      ? { runs: input.automation.runs }
      : undefined,
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
  const automationStats = dispatch.consumers.find(
    (row) => row.consumerName === AUTOMATION_CONSUMER_NAME
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
        expenses: input.businessState.expenses,
        accounts: input.businessState.accounts,
        journals: input.businessState.journals,
        projections: input.businessState.projections,
        attention: input.businessState.attention,
        families: ["attentionQueue"],
      });
      if (input.automation?.outbox) {
        const asOf = todayInTimezone(tenantContext.timezone);
        const overdue = await input.context.listOverdueInvoices({
          tenantId,
          asOfDate: asOf,
        });
        await emitInvoiceOverdueEvents({
          tenantId,
          asOf,
          overdue,
          outbox: input.automation.outbox,
          runs: input.automation.runs,
          attention: input.automation.attention,
        });

        const openAttention = await input.automation.attention.listOpen(tenantId);
        const idleIds = new Set(
          openAttention
            .filter((item) => item.type === "IDLE_QUOTATION")
            .map((item) => item.resourceId)
        );
        if (idleIds.size > 0) {
          const quotations = await input.businessState.sales.listQuotations({
            tenantId,
            status: "ALL",
          });
          await emitQuotationIdleEvents({
            tenantId,
            asOf,
            idleDays: IDLE_QUOTATION_DAYS,
            quotations: quotations
              .filter((row) => idleIds.has(row.id) && row.tenantId === tenantId)
              .map((row) => ({
                id: row.id,
                number: row.number,
                customerName: row.customerName,
                status: row.status,
                issuedOn: row.issuedOn,
              })),
            outbox: input.automation.outbox,
            runs: input.automation.runs,
          });
        }

        const lowStockIds = new Set(
          openAttention
            .filter((item) => item.type === "LOW_STOCK")
            .map((item) => item.resourceId)
        );
        if (lowStockIds.size > 0) {
          const threshold = parseLowStockThreshold(
            tenantContext.lowStockThresholdMajor
          );
          const lowStock = await listLowStockProducts({
            tenantId,
            lowStockThreshold: threshold,
            catalog: input.businessState.catalog,
            inventory: input.businessState.inventory,
          });
          await emitStockLowEvents({
            tenantId,
            asOf,
            products: lowStock
              .filter(
                (row) =>
                  row.tenantId === tenantId &&
                  lowStockIds.has(row.productId) &&
                  row.isLowStock
              )
              .map((row) => ({
                id: row.productId,
                productName: row.productName,
                sku: row.sku,
                quantityMajor: row.quantity
                  ? toQuantityMajorString(row.quantity)
                  : "0",
                unitOfMeasurement: row.unitOfMeasurement,
                thresholdMajor: tenantContext.lowStockThresholdMajor,
              })),
            outbox: input.automation.outbox,
            runs: input.automation.runs,
          });
        }
      }
    }
  }

  let automationSucceeded = 0;
  let automationFailed = 0;
  let automationSkipped = 0;
  if (input.automation) {
    const processed = await processDueWorkflowRuns({
      deps: input.automation,
      tenantId: input.tenantId,
      limit: input.limit ?? 20,
    });
    automationSucceeded = processed.succeeded;
    automationFailed = processed.failed;
    automationSkipped = processed.skipped;
  }

  return {
    processedEvents:
      dispatch.totalAttempted +
      dispatch.consumers.reduce((sum, row) => sum + row.skipped, 0),
    notificationsCreated: notificationsStats?.succeeded ?? 0,
    businessStateHandled: businessStateStats?.succeeded ?? 0,
    overdueChecked,
    consumerFailures: dispatch.totalFailed,
    automationEnqueued: automationStats?.succeeded ?? 0,
    automationSucceeded,
    automationFailed,
    automationSkipped,
  };
}
