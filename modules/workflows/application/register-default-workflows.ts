import { createCollectionsRemindWorkflow } from "@/modules/workflows/application/collections-workflow";
import { createExpenseAnomalyWorkflow } from "@/modules/workflows/application/expense-anomaly-workflow";
import { createQuotationFollowUpWorkflow } from "@/modules/workflows/application/quotation-followup-workflow";
import { createReorderPrepareWorkflow } from "@/modules/workflows/application/reorder-workflow";
import { registerWorkflow } from "@/modules/workflows/application/registry";
import { createNoopProofWorkflow } from "@/modules/workflows/application/proof-noop-workflow";

/**
 * Default workflows for the automation consumer. Safe to call on every
 * worker pass (replace-by-id).
 */
export function registerDefaultWorkflows(): void {
  registerWorkflow(createNoopProofWorkflow());
  registerWorkflow(createCollectionsRemindWorkflow());
  registerWorkflow(createQuotationFollowUpWorkflow());
  registerWorkflow(createReorderPrepareWorkflow());
  registerWorkflow(createExpenseAnomalyWorkflow());
}
