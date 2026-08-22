import { unusualExpenseNaturalKey } from "@/modules/business-state/domain/attention-keys";
import { recordExpenseAnomalyFlagged } from "@/modules/business-state/application/record-expansion-outcomes";
import type { OutboxEventRecord } from "@/modules/events/domain/types";
import { toMajorString } from "@/modules/shared-kernel/money";
import {
  expenseAnomalyConcurrencyKey,
  expenseAnomalyIdempotencyKey,
  payloadString,
} from "@/modules/workflows/domain/expansion-keys";
import {
  EXPENSE_ANOMALY_WORKFLOW_ID,
  type WorkflowDefinition,
} from "@/modules/workflows/domain/types";

function expenseNumber(event: OutboxEventRecord): string | null {
  return payloadString(event.payload, "number");
}

/**
 * Unusual expense alert: inform/recommend only. Never rewrites category
 * and never posts or edits the expense.
 */
export function createExpenseAnomalyWorkflow(): WorkflowDefinition {
  return {
    id: EXPENSE_ANOMALY_WORKFLOW_ID,
    label: "Unusual expense",
    eventTypes: ["ExpenseRecorded"],
    autonomyLevel: "L0",
    mode: "dry_run",
    idempotencyKey(event) {
      return expenseAnomalyIdempotencyKey(event.aggregateId);
    },
    concurrencyKey(event) {
      return expenseAnomalyConcurrencyKey(event.aggregateId);
    },
    async condition(event, context) {
      const item = await context.attention.findByNaturalKey(
        context.tenantId,
        unusualExpenseNaturalKey(event.aggregateId)
      );
      if (!item || item.tenantId !== context.tenantId) {
        return { match: false, reason: "not_unusual" };
      }
      if (item.type !== "UNUSUAL_EXPENSE" || item.status !== "OPEN") {
        return { match: false, reason: "not_open_unusual_expense" };
      }

      const flagged = await context.attention.listOutcomes({
        tenantId: context.tenantId,
        kind: "EXPENSE_ANOMALY_FLAGGED",
        resourceType: "Expense",
        resourceIds: [event.aggregateId],
      });
      if (flagged.length > 0) {
        return { match: false, reason: "already_flagged" };
      }

      return {
        match: true,
        amountMajor: item.amount ? toMajorString(item.amount) : null,
      };
    },
    async reason(event, context) {
      const item = await context.attention.findByNaturalKey(
        context.tenantId,
        unusualExpenseNaturalKey(event.aggregateId)
      );
      const number = expenseNumber(event);
      return {
        summary:
          item?.title ??
          `Expense ${number ?? event.aggregateId} is unusually high versus recent similar expenses.`,
      };
    },
    async action(event, context) {
      const item = await context.attention.findByNaturalKey(
        context.tenantId,
        unusualExpenseNaturalKey(event.aggregateId)
      );
      const number = expenseNumber(event);
      const category = payloadString(event.payload, "category");

      await recordExpenseAnomalyFlagged({
        tenantId: context.tenantId,
        expenseId: event.aggregateId,
        payload: {
          number,
          category,
          posted: false,
          recategorized: false,
        },
        attention: context.attention,
        outbox: context.toolContext?.repositories.outbox,
      });

      return {
        executed: false,
        dryRun: true,
        message:
          "Flagged an unusual expense for review. Category and posting were not changed.",
        payload: {
          expenseId: event.aggregateId,
          number,
          category,
          title: item?.title ?? null,
          posted: false,
          recategorized: false,
        },
      };
    },
  };
}
