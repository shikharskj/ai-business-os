import { getWorkflow } from "@/modules/workflows/application/registry";
import {
  PROOF_NOOP_WORKFLOW_ID,
  COLLECTIONS_REMIND_WORKFLOW_ID,
  QUOTATION_FOLLOW_UP_WORKFLOW_ID,
  REORDER_PREPARE_WORKFLOW_ID,
  EXPENSE_ANOMALY_WORKFLOW_ID,
} from "@/modules/workflows/domain/types";
import type { WorkflowRun } from "@/modules/workflows/domain/types";
import type { WorkflowRunView } from "@/modules/workflows/schemas/workflow-run.schema";

const FALLBACK_LABELS: Record<string, string> = {
  [PROOF_NOOP_WORKFLOW_ID]: "Runtime check",
  [COLLECTIONS_REMIND_WORKFLOW_ID]: "Collection reminder",
  [QUOTATION_FOLLOW_UP_WORKFLOW_ID]: "Quotation follow-up",
  [REORDER_PREPARE_WORKFLOW_ID]: "Reorder prepare",
  [EXPENSE_ANOMALY_WORKFLOW_ID]: "Unusual expense",
};

export function workflowLabel(workflowId: string): string {
  return getWorkflow(workflowId)?.label ?? FALLBACK_LABELS[workflowId] ?? workflowId;
}

export function workflowRunHref(
  aggregateType: string,
  aggregateId: string
): string | null {
  switch (aggregateType) {
    case "SalesInvoice":
      return `/app/sales/invoices/${aggregateId}`;
    case "Quotation":
      return `/app/sales/quotations/${aggregateId}`;
    case "Product":
      return `/app/inventory/products/${aggregateId}`;
    case "Expense":
      return `/app/expenses/${aggregateId}`;
    default:
      return null;
  }
}

function resultMessage(run: WorkflowRun): string | null {
  const message = run.result.message;
  return typeof message === "string" && message.length > 0 ? message : null;
}

export function toWorkflowRunView(run: WorkflowRun): WorkflowRunView {
  return {
    id: run.id,
    workflowId: run.workflowId,
    label: workflowLabel(run.workflowId),
    status: run.status,
    currentStep: run.currentStep,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt ? run.completedAt.toISOString() : null,
    lastError: run.lastError,
    aggregateType: run.aggregateType,
    aggregateId: run.aggregateId,
    triggerEventType: run.triggerEventType,
    attemptCount: run.attemptCount,
    relatedHref: workflowRunHref(run.aggregateType, run.aggregateId),
    resultMessage: resultMessage(run),
  };
}
