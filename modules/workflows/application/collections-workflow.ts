import { executeAiTool } from "@/modules/ai/application/execute-tool";
import { previewAiAction } from "@/modules/ai/domain/assistant-actions";
import {
  paymentRemindersOutputSchema,
  type PaymentRemindersOutput,
} from "@/modules/ai/schemas/ai-tool.schema";
import { overdueReceivableNaturalKey } from "@/modules/business-state/domain/attention-keys";
import { ATTENTION_SEVERITY, type AttentionItem } from "@/modules/business-state/domain/types";
import type { OutboxEventRecord } from "@/modules/events/domain/types";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { toMajorString } from "@/modules/shared-kernel/money";
import {
  collectionsConcurrencyKey,
  collectionsCooldownMs,
  collectionsRemindIdempotencyKey,
  invoiceOverdueAsOf,
  payloadString,
} from "@/modules/workflows/domain/collections-keys";
import {
  collectionsRankOf,
  rankCollectionsCandidates,
  type CollectionsCandidate,
} from "@/modules/workflows/domain/collections-priority";
import {
  COLLECTIONS_REMIND_WORKFLOW_ID,
  type WorkflowActionContext,
  type WorkflowDefinition,
} from "@/modules/workflows/domain/types";

function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function reminderSendMessage(output: PaymentRemindersOutput | null): string {
  const sentCount = output?.sentCount ?? 0;
  if (sentCount > 0) {
    return "Sent an in-app payment reminder under the tenant L4 policy.";
  }

  const statuses = output?.reminders.map((row) => row.status) ?? [];
  if (statuses.includes("failed")) {
    return "Could not send the payment reminder.";
  }
  if (statuses.includes("not_found")) {
    return "Invoice was not found; reminder was not sent.";
  }
  if (statuses.includes("not_overdue")) {
    return "Invoice is no longer overdue; reminder was not sent.";
  }
  if (statuses.includes("already_sent")) {
    return "Reminder was already sent for this invoice today.";
  }
  return "Payment reminder was not sent.";
}

function asOfFor(event: OutboxEventRecord, context: WorkflowActionContext): string {
  return invoiceOverdueAsOf(event) ?? todayInTimezone(context.timezone);
}

function overdueDaysFromAttention(item: AttentionItem): number {
  return Math.max(
    item.severity - ATTENTION_SEVERITY.OVERDUE_RECEIVABLE_BASE,
    0
  );
}

function candidatesFromAttention(items: AttentionItem[]): CollectionsCandidate[] {
  const candidates: CollectionsCandidate[] = [];
  for (const item of items) {
    if (item.type !== "OVERDUE_RECEIVABLE" || item.status !== "OPEN") continue;
    if (!item.amount) continue;
    candidates.push({
      invoiceId: item.resourceId,
      outstandingMinor: item.amount.amountMinor,
      daysOverdue: overdueDaysFromAttention(item),
    });
  }
  return candidates;
}

/**
 * Collections vertical: overdue invoice → rank by amount/days → draft reminder
 * (existing preview path) → send via executeAiTool L4 when the runner allows,
 * otherwise leave prepared for L3 confirm. In-app channel only.
 */
export function createCollectionsRemindWorkflow(): WorkflowDefinition {
  return {
    id: COLLECTIONS_REMIND_WORKFLOW_ID,
    label: "Collection reminder",
    eventTypes: ["InvoiceOverdue"],
    autonomyLevel: "L4",
    actionClass: "payment_reminder",
    mode: "execute",
    onL4Denied: "prepare",
    idempotencyKey(event) {
      const asOf = invoiceOverdueAsOf(event) ?? "unknown";
      return collectionsRemindIdempotencyKey(event.aggregateId, asOf);
    },
    concurrencyKey(event) {
      return collectionsConcurrencyKey(event.aggregateId);
    },
    async condition(event, context) {
      const item = await context.attention.findByNaturalKey(
        context.tenantId,
        overdueReceivableNaturalKey(event.aggregateId)
      );
      if (!item || item.tenantId !== context.tenantId) {
        return { match: false, reason: "not_in_attention_queue" };
      }
      if (item.type !== "OVERDUE_RECEIVABLE" || item.status !== "OPEN") {
        return { match: false, reason: "not_open_overdue" };
      }
      if (!item.amount) {
        return { match: false, reason: "missing_amount" };
      }

      const sent = await context.attention.listOutcomes({
        tenantId: context.tenantId,
        kind: "REMINDER_SENT",
        resourceType: "SalesInvoice",
        resourceIds: [event.aggregateId],
        recordedAfter: new Date(Date.now() - collectionsCooldownMs()),
      });
      if (sent.length > 0) {
        return { match: false, reason: "cooldown" };
      }

      return { match: true, amountMajor: toMajorString(item.amount) };
    },
    async reason(event, context) {
      const asOf = asOfFor(event, context);
      const open = await context.attention.listOpen(context.tenantId);
      const ranked = rankCollectionsCandidates(candidatesFromAttention(open));
      const rank = collectionsRankOf(ranked, event.aggregateId);
      const dueOn = payloadString(event.payload, "dueOn");
      const daysOverdue = dueOn ? Math.max(daysBetween(dueOn, asOf), 0) : null;
      const number = payloadString(event.payload, "number");

      return {
        summary:
          rank === null
            ? `Invoice ${number ?? event.aggregateId} is overdue.`
            : `Ranked ${rank} of ${ranked.length} overdue invoices by amount then days overdue.`,
        details: {
          rank,
          overdueCount: ranked.length,
          daysOverdue,
          asOf,
        },
      };
    },
    async action(event, context) {
      const invoiceIds = [event.aggregateId];
      const draft = previewAiAction({
        toolName: "send_payment_reminders",
        input: { invoiceIds },
      });
      const asOf = asOfFor(event, context);

      if (!context.l4Allowed) {
        return {
          executed: false,
          dryRun: true,
          message:
            "Prepared an in-app payment reminder. Confirm in Needs attention to send — L4 auto-send is off or over the limit.",
          payload: {
            invoiceIds,
            draft: draft
              ? {
                  title: draft.title,
                  summary: draft.summary,
                  impact: draft.impact,
                }
              : null,
            l4DeniedReason: context.l4DeniedReason ?? null,
          },
        };
      }

      if (!context.toolContext) {
        return {
          executed: false,
          message: "Could not resolve a trusted sender for L4 send.",
          payload: { invoiceIds, draft: draft ? { title: draft.title } : null },
        };
      }

      const item = await context.attention.findByNaturalKey(
        context.tenantId,
        overdueReceivableNaturalKey(event.aggregateId)
      );
      if (!item?.amount) {
        return {
          executed: false,
          message: "Overdue invoice is no longer in the attention queue.",
          payload: { invoiceIds },
        };
      }

      const result = await executeAiTool({
        context: context.toolContext,
        toolName: "send_payment_reminders",
        input: { invoiceIds },
        autonomyAttempt: "L4",
        policyAmountMajor: toMajorString(item.amount),
        automationId: COLLECTIONS_REMIND_WORKFLOW_ID,
      });

      const parsed = paymentRemindersOutputSchema.safeParse(result.output);
      const output = parsed.success ? parsed.data : null;
      const sentCount = output?.sentCount ?? 0;
      const failedCount = output?.failedCount ?? 0;

      return {
        executed: sentCount > 0,
        message: reminderSendMessage(output),
        payload: {
          invoiceIds,
          sentCount,
          failedCount,
          asOf: output?.asOf ?? asOf,
          auditRecordId: result.auditRecordId,
        },
      };
    },
  };
}
