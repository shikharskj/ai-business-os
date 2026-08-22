import type { AiToolContext } from "@/modules/ai/domain/tool-types";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import { recordAutomationOutcome } from "@/modules/business-state/application/record-outcome";
import type { AutomationOutcomeKind } from "@/modules/business-state/domain/types";
import type { OutboxEventRecord } from "@/modules/events/domain/types";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  evaluateL4Autonomy,
  type TenantAutonomyPolicy,
} from "@/modules/tenant/domain/autonomy-policy";
import { nextWorkflowAttemptAt } from "@/modules/workflows/domain/backoff";
import {
  isWorkflowPermanentError,
  WorkflowPermanentError,
} from "@/modules/workflows/domain/errors";
import type {
  WorkflowActionContext,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunStatus,
  WorkflowStep,
} from "@/modules/workflows/domain/types";
import { getWorkflow } from "@/modules/workflows/application/registry";
import type { AutomationMetrics } from "@/modules/workflows/infrastructure/metrics";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

export type AutomationTenantContext = {
  actorUserId: string | null;
  currency: string;
  timezone: string;
  policy: TenantAutonomyPolicy;
};

export type ExecuteWorkflowRunDeps = {
  runs: WorkflowRunRepository;
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
  metrics?: AutomationMetrics;
  resolveTenantContext(
    tenantId: string
  ): Promise<AutomationTenantContext | null>;
  resolveToolContext?(tenantId: string): Promise<AiToolContext | null>;
  now?: Date;
};

function eventFromRun(run: WorkflowRun): OutboxEventRecord {
  return {
    id: run.triggerEventId,
    tenantId: run.tenantId,
    eventType: run.triggerEventType,
    aggregateType: run.aggregateType,
    aggregateId: run.aggregateId,
    payload: run.triggerPayload,
    createdAt: run.createdAt,
    processedAt: null,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Workflow action failed.";
}

async function persistRun(input: {
  runs: WorkflowRunRepository;
  run: WorkflowRun;
  status: WorkflowRunStatus;
  currentStep: WorkflowStep;
  now: Date;
  lastError?: string | null;
  result?: Record<string, unknown>;
  outcomeKind?: AutomationOutcomeKind | null;
  nextAttemptAt?: Date;
}): Promise<WorkflowRun> {
  const terminal =
    input.status === "SUCCEEDED" ||
    input.status === "SKIPPED" ||
    input.status === "DEAD_LETTER";

  return input.runs.update(input.run.id, input.run.tenantId, {
    status: input.status,
    currentStep: input.currentStep,
    lastError: input.lastError ?? null,
    result: input.result ?? input.run.result,
    outcomeKind: input.outcomeKind ?? input.run.outcomeKind,
    nextAttemptAt: input.nextAttemptAt ?? input.run.nextAttemptAt,
    completedAt: terminal ? input.now : null,
  });
}

async function recordOutcome(input: {
  kind: AutomationOutcomeKind;
  run: WorkflowRun;
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
  payload: Record<string, unknown>;
}): Promise<void> {
  await recordAutomationOutcome({
    tenantId: input.run.tenantId,
    kind: input.kind,
    idempotencyKey: `workflow:${input.run.idempotencyKey}:${input.kind}`,
    resourceType: input.run.aggregateType,
    resourceId: input.run.aggregateId,
    payload: {
      workflowId: input.run.workflowId,
      runId: input.run.id,
      triggerEventId: input.run.triggerEventId,
      ...input.payload,
    },
    attention: input.attention,
    outbox: input.outbox,
    correlationId: input.run.correlationId ?? undefined,
  });
}

/**
 * EVENT → CONDITION → REASONING → ACTION → RESULT → OUTCOME
 *
 * Mutating execute is L4-only and fail-closed via evaluateL4Autonomy.
 * The runner never posts journals or inventory.
 */
export async function executeWorkflowRun(input: {
  run: WorkflowRun;
  deps: ExecuteWorkflowRunDeps;
  workflow?: WorkflowDefinition;
}): Promise<WorkflowRun> {
  const now = input.deps.now ?? new Date();
  const workflow = input.workflow ?? getWorkflow(input.run.workflowId);
  const metrics = input.deps.metrics;

  if (!workflow) {
    const updated = await persistRun({
      runs: input.deps.runs,
      run: input.run,
      status: "DEAD_LETTER",
      currentStep: "EVENT",
      now,
      lastError: `Unknown workflow "${input.run.workflowId}"`,
      outcomeKind: "AUTOMATION_FAILED",
    });
    await recordOutcome({
      kind: "AUTOMATION_FAILED",
      run: updated,
      attention: input.deps.attention,
      outbox: input.deps.outbox,
      payload: { reason: "unknown_workflow" },
    });
    metrics?.increment("fail", {
      workflowId: input.run.workflowId,
      tenantId: input.run.tenantId,
    });
    return updated;
  }

    const tenant = await input.deps.resolveTenantContext(input.run.tenantId);
    if (!tenant) {
      const updated = await persistRun({
        runs: input.deps.runs,
        run: input.run,
        status: "DEAD_LETTER",
        currentStep: "EVENT",
        now,
        lastError: "Tenant context was not found",
        outcomeKind: "AUTOMATION_FAILED",
      });
      await recordOutcome({
        kind: "AUTOMATION_FAILED",
        run: updated,
        attention: input.deps.attention,
        outbox: input.deps.outbox,
        payload: { reason: "missing_tenant" },
      });
      metrics?.increment("fail", {
        workflowId: workflow.id,
        tenantId: input.run.tenantId,
      });
      return updated;
    }

    const policy = tenant.policy;
    const event = eventFromRun(input.run);
    const toolContext = input.deps.resolveToolContext
      ? await input.deps.resolveToolContext(input.run.tenantId)
      : null;
    const context: WorkflowActionContext = {
      tenantId: input.run.tenantId,
      event,
      run: input.run,
      policy,
      actorUserId: tenant.actorUserId,
      currency: tenant.currency,
      timezone: tenant.timezone,
      correlationId: input.run.correlationId ?? undefined,
      idempotencyKey: input.run.idempotencyKey,
      l4Allowed: false,
      l4DeniedReason: null,
      attention: input.deps.attention,
      toolContext,
    };

    try {
    if (policy.disabledAutomations.includes(workflow.id)) {
      const updated = await persistRun({
        runs: input.deps.runs,
        run: input.run,
        status: "SKIPPED",
        currentStep: "CONDITION",
        now,
        result: { skipReason: "automation_disabled" },
        outcomeKind: "AUTOMATION_SKIPPED",
      });
      await recordOutcome({
        kind: "AUTOMATION_SKIPPED",
        run: updated,
        attention: input.deps.attention,
        outbox: input.deps.outbox,
        payload: { reason: "automation_disabled" },
      });
      metrics?.increment("skip", {
        workflowId: workflow.id,
        tenantId: input.run.tenantId,
      });
      return updated;
    }

    const condition = await workflow.condition(event, context);
    if (!condition.match) {
      const updated = await persistRun({
        runs: input.deps.runs,
        run: input.run,
        status: "SKIPPED",
        currentStep: "CONDITION",
        now,
        result: { skipReason: condition.reason },
        outcomeKind: "AUTOMATION_SKIPPED",
      });
      await recordOutcome({
        kind: "AUTOMATION_SKIPPED",
        run: updated,
        attention: input.deps.attention,
        outbox: input.deps.outbox,
        payload: { reason: condition.reason },
      });
      metrics?.increment("skip", {
        workflowId: workflow.id,
        tenantId: input.run.tenantId,
      });
      return updated;
    }

    const reasoning = workflow.reason
      ? await workflow.reason(event, context)
      : { summary: workflow.label };

    if (workflow.mode === "execute") {
      if (workflow.autonomyLevel !== "L4") {
        throw new WorkflowPermanentError(
          "not_autonomous",
          "Automation execute is L4-only. L3 stays on the confirm path."
        );
      }
      if (!workflow.actionClass) {
        throw new WorkflowPermanentError(
          "class_not_allowed",
          "L4 execute requires an action class."
        );
      }
      const decision = evaluateL4Autonomy({
        actionClass: workflow.actionClass,
        amountMajor: condition.amountMajor,
        policy,
        automationId: workflow.id,
        currency: context.currency,
      });
      if (!decision.allowed) {
        if (workflow.onL4Denied !== "prepare") {
          const updated = await persistRun({
            runs: input.deps.runs,
            run: input.run,
            status: "SKIPPED",
            currentStep: "ACTION",
            now,
            result: {
              reasoning,
              skipReason: decision.reason,
            },
            outcomeKind: "AUTOMATION_SKIPPED",
          });
          await recordOutcome({
            kind: "AUTOMATION_SKIPPED",
            run: updated,
            attention: input.deps.attention,
            outbox: input.deps.outbox,
            payload: { reason: decision.reason },
          });
          metrics?.increment("skip", {
            workflowId: workflow.id,
            tenantId: input.run.tenantId,
          });
          return updated;
        }
        context.l4Allowed = false;
        context.l4DeniedReason = decision.reason;
      } else {
        context.l4Allowed = true;
      }
    }

    const actionResult = await workflow.action(event, context);
    const result = {
      reasoning,
      action: actionResult,
      dryRun: workflow.mode === "dry_run" || actionResult.dryRun === true,
    };

    const updated = await persistRun({
      runs: input.deps.runs,
      run: input.run,
      status: "SUCCEEDED",
      currentStep: "OUTCOME",
      now,
      result,
      outcomeKind: "AUTOMATION_SUCCEEDED",
    });
    await recordOutcome({
      kind: "AUTOMATION_SUCCEEDED",
      run: updated,
      attention: input.deps.attention,
      outbox: input.deps.outbox,
      payload: {
        dryRun: result.dryRun,
        executed: actionResult.executed,
        message: actionResult.message,
      },
    });
    metrics?.increment("success", {
      workflowId: workflow.id,
      tenantId: input.run.tenantId,
    });
    return updated;
  } catch (error) {
    const permanent = isWorkflowPermanentError(error);
    const exhausted = input.run.attemptCount >= input.run.maxAttempts;
    const status: WorkflowRunStatus =
      permanent || exhausted ? "DEAD_LETTER" : "RETRY";
    const updated = await persistRun({
      runs: input.deps.runs,
      run: input.run,
      status,
      currentStep: "ACTION",
      now,
      lastError: errorMessage(error),
      result: { error: errorMessage(error) },
      outcomeKind: "AUTOMATION_FAILED",
      nextAttemptAt:
        status === "RETRY" ? nextWorkflowAttemptAt(input.run.attemptCount, now) : now,
    });
    await recordOutcome({
      kind: "AUTOMATION_FAILED",
      run: updated,
      attention: input.deps.attention,
      outbox: input.deps.outbox,
      payload: {
        reason: status === "DEAD_LETTER" ? "dead_letter" : "retry",
        error: errorMessage(error),
      },
    });
    metrics?.increment("fail", {
      workflowId: workflow.id,
      tenantId: input.run.tenantId,
    });
    return updated;
  }
}
