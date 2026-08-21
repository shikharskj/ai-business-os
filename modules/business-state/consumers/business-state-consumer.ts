import type { OutboxEventConsumer } from "@/modules/events/domain/types";
import { projectionFamiliesForEvent } from "@/modules/business-state/application/event-families";
import {
  rebuildBusinessStateProjections,
  type RebuildBusinessStateDeps,
} from "@/modules/business-state/application/rebuild";

export const BUSINESS_STATE_CONSUMER_NAME = "business-state";

export type BusinessStateConsumerTenantContext = {
  timezone: string;
  lowStockThresholdMajor: string;
  currency: string;
};

export type BusinessStateConsumerDeps = Omit<
  RebuildBusinessStateDeps,
  "tenantId" | "timezone" | "lowStockThresholdMajor" | "currency" | "families" | "markRebuilt"
> & {
  resolveTenantContext(
    tenantId: string
  ): Promise<BusinessStateConsumerTenantContext | null>;
};

/**
 * Outbox consumer that refreshes BusinessState projections from domain truth.
 * Replaces the temporary projection-stub from spec 01.
 */
export function createBusinessStateOutboxConsumer(
  deps: BusinessStateConsumerDeps
): OutboxEventConsumer {
  return {
    name: BUSINESS_STATE_CONSUMER_NAME,
    async handle(event) {
      const families = projectionFamiliesForEvent(event.eventType);
      if (families.length === 0) {
        return { handled: false };
      }

      const context = await deps.resolveTenantContext(event.tenantId);
      if (!context) {
        return { handled: false };
      }

      await rebuildBusinessStateProjections({
        tenantId: event.tenantId,
        timezone: context.timezone,
        lowStockThresholdMajor: context.lowStockThresholdMajor,
        currency: context.currency,
        sales: deps.sales,
        payments: deps.payments,
        catalog: deps.catalog,
        inventory: deps.inventory,
        projections: deps.projections,
        families,
      });

      return { handled: true };
    },
  };
}
