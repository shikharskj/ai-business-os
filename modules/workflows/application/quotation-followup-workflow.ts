import { idleQuotationNaturalKey } from "@/modules/business-state/domain/attention-keys";
import { recordQuotationFollowUpProposed } from "@/modules/business-state/application/record-expansion-outcomes";
import type { OutboxEventRecord } from "@/modules/events/domain/types";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { toMajorString } from "@/modules/shared-kernel/money";
import { collectionsCooldownMs } from "@/modules/workflows/domain/collections-keys";
import {
  expansionAsOf,
  payloadString,
  quotationFollowUpConcurrencyKey,
  quotationFollowUpIdempotencyKey,
} from "@/modules/workflows/domain/expansion-keys";
import {
  EXPANSION_COOLDOWN_DAYS,
  QUOTATION_FOLLOW_UP_WORKFLOW_ID,
  type WorkflowActionContext,
  type WorkflowDefinition,
} from "@/modules/workflows/domain/types";

function asOfFor(event: OutboxEventRecord, context: WorkflowActionContext): string {
  return expansionAsOf(event) ?? todayInTimezone(context.timezone);
}

/**
 * Idle quotation follow-up: attention-first, L1 recommend + L2 in-app draft.
 * Does not send email (no delivery channel on this vertical).
 */
export function createQuotationFollowUpWorkflow(): WorkflowDefinition {
  return {
    id: QUOTATION_FOLLOW_UP_WORKFLOW_ID,
    label: "Quotation follow-up",
    eventTypes: ["QuotationIdle"],
    autonomyLevel: "L1",
    mode: "dry_run",
    idempotencyKey(event) {
      const asOf = expansionAsOf(event) ?? "unknown";
      return quotationFollowUpIdempotencyKey(event.aggregateId, asOf);
    },
    concurrencyKey(event) {
      return quotationFollowUpConcurrencyKey(event.aggregateId);
    },
    async condition(event, context) {
      const item = await context.attention.findByNaturalKey(
        context.tenantId,
        idleQuotationNaturalKey(event.aggregateId)
      );
      if (!item || item.tenantId !== context.tenantId) {
        return { match: false, reason: "not_in_attention_queue" };
      }
      if (item.type !== "IDLE_QUOTATION" || item.status !== "OPEN") {
        return { match: false, reason: "not_open_idle_quotation" };
      }

      const recent = await context.attention.listOutcomes({
        tenantId: context.tenantId,
        kind: "QUOTATION_FOLLOW_UP_PROPOSED",
        resourceType: "Quotation",
        resourceIds: [event.aggregateId],
        recordedAfter: new Date(
          Date.now() - collectionsCooldownMs(EXPANSION_COOLDOWN_DAYS)
        ),
      });
      if (recent.length > 0) {
        return { match: false, reason: "cooldown" };
      }

      return {
        match: true,
        amountMajor: item.amount ? toMajorString(item.amount) : null,
      };
    },
    async reason(event) {
      const number = payloadString(event.payload, "number");
      return {
        summary: `Quotation ${number ?? event.aggregateId} is idle and needs a follow-up.`,
      };
    },
    async action(event, context) {
      const asOf = asOfFor(event, context);
      const number = payloadString(event.payload, "number");
      const customerName = payloadString(event.payload, "customerName");
      const status = payloadString(event.payload, "status");
      const draft = {
        channel: "in_app" as const,
        sent: false,
        title: `Follow up on ${number ?? "quotation"}`,
        message: `Follow up with ${customerName ?? "the customer"} on ${
          number ?? "this quotation"
        }. It is still ${status ? status.toLowerCase() : "open"} without converting to an invoice.`,
      };

      await recordQuotationFollowUpProposed({
        tenantId: context.tenantId,
        quotationId: event.aggregateId,
        asOf,
        payload: { draft, posted: false },
        attention: context.attention,
        outbox: context.toolContext?.repositories.outbox,
      });

      return {
        executed: false,
        dryRun: true,
        message:
          "Prepared an in-app quotation follow-up. No email was sent — there is no delivery channel on this path.",
        payload: {
          quotationId: event.aggregateId,
          draft,
          posted: false,
        },
      };
    },
  };
}
