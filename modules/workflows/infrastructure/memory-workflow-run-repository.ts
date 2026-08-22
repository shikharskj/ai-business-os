import { WORKFLOW_MAX_ATTEMPTS, type WorkflowRun } from "@/modules/workflows/domain/types";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

function cloneRun(run: WorkflowRun): WorkflowRun {
  return {
    ...run,
    triggerPayload: { ...run.triggerPayload },
    result: { ...run.result },
  };
}

export function createMemoryWorkflowRunRepository(
  initial: WorkflowRun[] = []
): WorkflowRunRepository & { runs: WorkflowRun[] } {
  const runs: WorkflowRun[] = initial.map(cloneRun);

  return {
    runs,

    async createIfAbsent(input) {
      const existing = runs.find(
        (row) =>
          row.tenantId === input.tenantId &&
          row.idempotencyKey === input.idempotencyKey
      );
      if (existing) {
        return { created: false, run: cloneRun(existing) };
      }
      const now = new Date();
      const run: WorkflowRun = {
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        workflowId: input.workflowId,
        triggerEventId: input.triggerEventId,
        triggerEventType: input.triggerEventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        triggerPayload: { ...input.triggerPayload },
        idempotencyKey: input.idempotencyKey,
        concurrencyKey: input.concurrencyKey,
        status: "PENDING",
        currentStep: "EVENT",
        attemptCount: 0,
        maxAttempts: WORKFLOW_MAX_ATTEMPTS,
        nextAttemptAt: now,
        lastError: null,
        result: {},
        outcomeKind: null,
        correlationId: input.correlationId ?? null,
        createdAt: now,
        startedAt: null,
        completedAt: null,
      };
      runs.push(run);
      return { created: true, run: cloneRun(run) };
    },

    async findByIdempotencyKey(tenantId, idempotencyKey) {
      const existing = runs.find(
        (row) =>
          row.tenantId === tenantId && row.idempotencyKey === idempotencyKey
      );
      return existing ? cloneRun(existing) : null;
    },

    async findById(tenantId, runId) {
      const existing = runs.find(
        (row) => row.tenantId === tenantId && row.id === runId
      );
      return existing ? cloneRun(existing) : null;
    },

    async claimDue(input) {
      const claimed: WorkflowRun[] = [];
      const runningKeys = new Set(
        runs
          .filter((row) => row.status === "RUNNING")
          .map((row) => `${row.tenantId}:${row.concurrencyKey}`)
      );

      const due = runs
        .filter((row) => {
          if (input.tenantId && row.tenantId !== input.tenantId) return false;
          if (row.status !== "PENDING" && row.status !== "RETRY") return false;
          return row.nextAttemptAt.getTime() <= input.now.getTime();
        })
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (const row of due) {
        if (claimed.length >= input.limit) break;
        const key = `${row.tenantId}:${row.concurrencyKey}`;
        if (runningKeys.has(key)) continue;
        row.status = "RUNNING";
        row.attemptCount += 1;
        row.startedAt = input.now;
        runningKeys.add(key);
        claimed.push(cloneRun(row));
      }

      return claimed;
    },

    async update(id, tenantId, patch) {
      const row = runs.find((item) => item.id === id && item.tenantId === tenantId);
      if (!row) {
        throw new Error(`Workflow run ${id} was not found for tenant ${tenantId}`);
      }
      row.status = patch.status;
      row.currentStep = patch.currentStep;
      if (patch.nextAttemptAt !== undefined) {
        row.nextAttemptAt = patch.nextAttemptAt;
      }
      if (patch.lastError !== undefined) {
        row.lastError = patch.lastError;
      }
      if (patch.result !== undefined) {
        row.result = { ...patch.result };
      }
      if (patch.outcomeKind !== undefined) {
        row.outcomeKind = patch.outcomeKind;
      }
      if (patch.completedAt !== undefined) {
        row.completedAt = patch.completedAt;
      }
      return cloneRun(row);
    },

    async listRecent(tenantId, limit) {
      return runs
        .filter((row) => row.tenantId === tenantId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, Math.min(Math.max(limit, 1), 50))
        .map(cloneRun);
    },
  };
}
