import type { WorkflowRun } from "@/modules/workflows/domain/types";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

export async function listRecentWorkflowRuns(input: {
  tenantId: string;
  runs: WorkflowRunRepository;
  limit?: number;
}): Promise<WorkflowRun[]> {
  return input.runs.listRecent(input.tenantId, input.limit ?? 10);
}
