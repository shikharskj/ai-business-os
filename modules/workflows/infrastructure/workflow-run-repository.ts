import type {
  ClaimDueWorkflowRunsInput,
  CreateWorkflowRunInput,
  WorkflowRun,
  WorkflowRunUpdate,
} from "@/modules/workflows/domain/types";

export type WorkflowRunRepository = {
  createIfAbsent(
    input: CreateWorkflowRunInput
  ): Promise<{ created: boolean; run: WorkflowRun }>;
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<WorkflowRun | null>;
  claimDue(input: ClaimDueWorkflowRunsInput): Promise<WorkflowRun[]>;
  update(id: string, tenantId: string, patch: WorkflowRunUpdate): Promise<WorkflowRun>;
  listRecent(tenantId: string, limit: number): Promise<WorkflowRun[]>;
};
