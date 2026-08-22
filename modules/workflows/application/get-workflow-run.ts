import type { WorkflowRun } from "@/modules/workflows/domain/types";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

export async function getWorkflowRun(input: {
  tenantId: string;
  runId: string;
  runs: WorkflowRunRepository;
}): Promise<WorkflowRun | null> {
  return input.runs.findById(input.tenantId, input.runId);
}
