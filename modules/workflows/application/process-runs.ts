import {
  executeWorkflowRun,
  type ExecuteWorkflowRunDeps,
} from "@/modules/workflows/application/runner";
import type { WorkflowRun } from "@/modules/workflows/domain/types";

export type ProcessDueWorkflowRunsResult = {
  claimed: number;
  succeeded: number;
  skipped: number;
  failed: number;
};

/**
 * Worker pass: claim due runs with tenant-safe concurrency keys, then
 * execute. Retries use nextAttemptAt backoff on the run row — not outbox
 * redelivery.
 */
export async function processDueWorkflowRuns(input: {
  deps: ExecuteWorkflowRunDeps;
  tenantId?: string;
  limit?: number;
  now?: Date;
}): Promise<ProcessDueWorkflowRunsResult> {
  const now = input.now ?? new Date();
  const claimed = await input.deps.runs.claimDue({
    now,
    limit: input.limit ?? 20,
    tenantId: input.tenantId,
  });

  const stats: ProcessDueWorkflowRunsResult = {
    claimed: claimed.length,
    succeeded: 0,
    skipped: 0,
    failed: 0,
  };

  for (const run of claimed) {
    const finished: WorkflowRun = await executeWorkflowRun({
      run,
      deps: { ...input.deps, now },
    });
    if (finished.status === "SUCCEEDED") {
      stats.succeeded += 1;
    } else if (finished.status === "SKIPPED") {
      stats.skipped += 1;
    } else {
      stats.failed += 1;
    }
  }

  return stats;
}
