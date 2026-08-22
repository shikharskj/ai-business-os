import type {
  OutboxEventConsumer,
  OutboxEventRecord,
} from "@/modules/events/domain/types";
import { projectionFamiliesForEvent } from "@/modules/business-state/application/event-families";
import {
  invoiceIdsFromPaymentPayload,
  recordPaidAfterReminderOutcomes,
} from "@/modules/business-state/application/record-paid-after-reminder";
import {
  rebuildBusinessStateProjections,
  type RebuildBusinessStateDeps,
} from "@/modules/business-state/application/rebuild";
import type { ProjectionFamily } from "@/modules/business-state/domain/types";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";

export const BUSINESS_STATE_CONSUMER_NAME = "business-state";

export type BusinessStateConsumerTenantContext = {
  timezone: string;
  lowStockThresholdMajor: string;
  currency: string;
};

export type BusinessStateConsumerDeps = Omit<
  RebuildBusinessStateDeps,
  | "tenantId"
  | "timezone"
  | "lowStockThresholdMajor"
  | "currency"
  | "families"
  | "markRebuilt"
> & {
  resolveTenantContext(
    tenantId: string
  ): Promise<BusinessStateConsumerTenantContext | null>;
  outbox?: OutboxRepository;
};

/**
 * Outbox consumer that refreshes BusinessState projections from domain truth.
 * Supports handleBatch so one outbox page coalesces rebuilds per tenant.
 */
export function createBusinessStateOutboxConsumer(
  deps: BusinessStateConsumerDeps
): OutboxEventConsumer {
  async function handleBatch(events: OutboxEventRecord[]) {
    if (events.length === 0) {
      return { handled: false };
    }

    const tenantId = events[0]!.tenantId;
    const familySet = new Set<ProjectionFamily>();
    for (const event of events) {
      if (event.tenantId !== tenantId) {
        throw new Error(
          "business-state handleBatch requires a single-tenant event group"
        );
      }
      for (const family of projectionFamiliesForEvent(event.eventType)) {
        familySet.add(family);
      }
    }

    const families = [...familySet];
    if (families.length === 0) {
      return { handled: false };
    }

    const context = await deps.resolveTenantContext(tenantId);
    if (!context) {
      return { handled: false };
    }

    for (const event of events) {
      if (event.eventType !== "PaymentReceived") continue;
      const invoiceIds = invoiceIdsFromPaymentPayload(event.payload);
      if (invoiceIds.length === 0) continue;
      await recordPaidAfterReminderOutcomes({
        tenantId,
        paymentId: event.aggregateId,
        invoiceIds,
        attention: deps.attention,
        outbox: deps.outbox,
      });
    }

    await rebuildBusinessStateProjections({
      tenantId,
      timezone: context.timezone,
      lowStockThresholdMajor: context.lowStockThresholdMajor,
      currency: context.currency,
      sales: deps.sales,
      payments: deps.payments,
      catalog: deps.catalog,
      inventory: deps.inventory,
      expenses: deps.expenses,
      accounts: deps.accounts,
      journals: deps.journals,
      projections: deps.projections,
      attention: deps.attention,
      families,
    });

    return { handled: true };
  }

  return {
    name: BUSINESS_STATE_CONSUMER_NAME,
    handleBatch,
    async handle(event) {
      return handleBatch([event]);
    },
  };
}
