import { afterEach, describe, expect, it } from "vitest";

import { createMemoryAttentionQueueRepository } from "@/modules/business-state/infrastructure/memory-attention-repository";
import {
  clearOutboxConsumers,
  createMemoryOutboxDispatchRepository,
  processOutboxConsumers,
  registerOutboxConsumer,
  type OutboxEventRecord,
} from "@/modules/events";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  defaultAutonomyPolicy,
  type TenantAutonomyPolicy,
} from "@/modules/tenant/domain/autonomy-policy";
import {
  clearWorkflows,
  createAutomationOutboxConsumer,
  createMemoryAutomationMetrics,
  createMemoryWorkflowRunRepository,
  createNoopProofWorkflow,
  enqueueWorkflowRun,
  executeWorkflowRun,
  processDueWorkflowRuns,
  registerWorkflow,
  WORKFLOW_MAX_ATTEMPTS,
  type ExecuteWorkflowRunDeps,
  type WorkflowDefinition,
} from "@/modules/workflows";

const TENANT = "tenant-a";
const OWNER = "user-owner";

function event(
  partial: Partial<OutboxEventRecord> &
    Pick<OutboxEventRecord, "eventType" | "aggregateId">
): OutboxEventRecord {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tenantId: partial.tenantId ?? TENANT,
    eventType: partial.eventType,
    aggregateType: partial.aggregateType ?? "AttentionItem",
    aggregateId: partial.aggregateId,
    payload: partial.payload ?? {},
    createdAt: partial.createdAt ?? new Date(),
    processedAt: partial.processedAt ?? null,
  };
}

function l4Policy(
  overrides: Partial<TenantAutonomyPolicy> = {}
): TenantAutonomyPolicy {
  return {
    ...defaultAutonomyPolicy(TENANT),
    allowedActionClasses: ["payment_reminder"],
    amountThresholds: { payment_reminder: "25000.00" },
    ...overrides,
  };
}

function deps(input?: {
  policy?: TenantAutonomyPolicy;
}): ExecuteWorkflowRunDeps & {
  attention: ReturnType<typeof createMemoryAttentionQueueRepository>;
  runs: ReturnType<typeof createMemoryWorkflowRunRepository>;
  metrics: ReturnType<typeof createMemoryAutomationMetrics>;
} {
  const attention = createMemoryAttentionQueueRepository();
  const runs = createMemoryWorkflowRunRepository();
  const metrics = createMemoryAutomationMetrics();
  const policy = input?.policy ?? defaultAutonomyPolicy(TENANT);
  return {
    runs,
    attention,
    outbox: createMemoryOutboxRepository(),
    metrics,
    async resolveTenantContext(tenantId) {
      return {
        actorUserId: OWNER,
        currency: "INR",
        timezone: "Asia/Kolkata",
        policy: { ...policy, tenantId },
      };
    },
  };
}

function executeWorkflow(
  overrides: Partial<WorkflowDefinition> & Pick<WorkflowDefinition, "action">
): WorkflowDefinition {
  return {
    id: "test.execute",
    label: "Test execute",
    eventTypes: ["AttentionDismissed"],
    autonomyLevel: "L4",
    actionClass: "payment_reminder",
    mode: "execute",
    async condition() {
      return { match: true, amountMajor: "1000.00" };
    },
    ...overrides,
  };
}

describe("automation runtime (post-mvp 09)", () => {
  afterEach(() => {
    clearWorkflows();
    clearOutboxConsumers();
  });

  it("runs a registered no-op workflow from an outbox event with idempotent replay", async () => {
    const runtime = deps();
    registerWorkflow(createNoopProofWorkflow());
    registerOutboxConsumer(createAutomationOutboxConsumer({ runs: runtime.runs }));

    const dismissed = event({
      id: "evt-dismiss",
      eventType: "AttentionDismissed",
      aggregateId: "att-1",
      payload: { attentionItemId: "att-1" },
    });
    const outbox = createMemoryOutboxDispatchRepository([dismissed]);

    await processOutboxConsumers({ outbox });
    const first = await processDueWorkflowRuns({ deps: runtime });
    expect(first.succeeded).toBe(1);
    expect(runtime.runs.runs).toHaveLength(1);
    expect(runtime.attention.outcomes[0]?.kind).toBe("AUTOMATION_SUCCEEDED");
    expect(runtime.metrics.snapshot()).toEqual({
      success: 1,
      fail: 0,
      skip: 0,
    });

    outbox.receipts.get("evt-dismiss")?.delete("automation");
    await processOutboxConsumers({ outbox });
    const second = await processDueWorkflowRuns({ deps: runtime });
    expect(second.claimed).toBe(0);
    expect(runtime.runs.runs).toHaveLength(1);
    expect(
      runtime.attention.outcomes.filter((row) => row.kind === "AUTOMATION_SUCCEEDED")
    ).toHaveLength(1);
  });

  it("does not call a failing action's domain mutation and records AUTOMATION_FAILED", async () => {
    const journalsPosted: string[] = [];
    const runtime = deps({ policy: l4Policy() });
    const workflow = executeWorkflow({
      async action() {
        throw new Error("delivery failed");
        journalsPosted.push("journal-1");
      },
    });
    registerWorkflow(workflow);

    const trigger = event({
      eventType: "AttentionDismissed",
      aggregateId: "att-fail",
    });
    const enqueued = await enqueueWorkflowRun({
      workflow,
      event: trigger,
      runs: runtime.runs,
    });
    expect(enqueued.run).toBeTruthy();
    const claimed = await runtime.runs.claimDue({
      now: new Date(),
      limit: 1,
    });

    const finished = await executeWorkflowRun({
      run: claimed[0]!,
      deps: runtime,
    });

    expect(journalsPosted).toEqual([]);
    expect(finished.status).toBe("RETRY");
    expect(finished.outcomeKind).toBe("AUTOMATION_FAILED");
    expect(runtime.attention.outcomes[0]?.kind).toBe("AUTOMATION_FAILED");
    expect(runtime.metrics.snapshot().fail).toBe(1);
  });

  it("consults autonomy policy before L4 execute and skips when L4 is off", async () => {
    let actionCalls = 0;
    const runtime = deps({ policy: defaultAutonomyPolicy(TENANT) });
    const workflow = executeWorkflow({
      async action() {
        actionCalls += 1;
        return { executed: true };
      },
    });
    registerWorkflow(workflow);

    const trigger = event({
      eventType: "AttentionDismissed",
      aggregateId: "att-l4",
    });
    await enqueueWorkflowRun({
      workflow,
      event: trigger,
      runs: runtime.runs,
    });
    await processDueWorkflowRuns({ deps: runtime });

    expect(actionCalls).toBe(0);
    expect(runtime.runs.runs[0]?.status).toBe("SKIPPED");
    expect(runtime.attention.outcomes[0]?.kind).toBe("AUTOMATION_SKIPPED");
    expect(runtime.runs.runs[0]?.result.skipReason).toBe("class_not_allowed");
  });

  it("executes an L4 action when policy allows the class and amount", async () => {
    let actionCalls = 0;
    const runtime = deps({ policy: l4Policy() });
    const workflow = executeWorkflow({
      async action() {
        actionCalls += 1;
        return { executed: true, message: "sent" };
      },
    });
    registerWorkflow(workflow);

    await enqueueWorkflowRun({
      workflow,
      event: event({
        eventType: "AttentionDismissed",
        aggregateId: "att-ok",
      }),
      runs: runtime.runs,
    });
    await processDueWorkflowRuns({ deps: runtime });

    expect(actionCalls).toBe(1);
    expect(runtime.runs.runs[0]?.status).toBe("SUCCEEDED");
    expect(runtime.attention.outcomes[0]?.kind).toBe("AUTOMATION_SUCCEEDED");
  });

  it("does not auto-execute a non-L4 workflow", async () => {
    let actionCalls = 0;
    const runtime = deps({ policy: l4Policy() });
    const workflow = executeWorkflow({
      autonomyLevel: "L3",
      async action() {
        actionCalls += 1;
        return { executed: true };
      },
    });
    registerWorkflow(workflow);

    await enqueueWorkflowRun({
      workflow,
      event: event({
        eventType: "AttentionDismissed",
        aggregateId: "att-l3",
      }),
      runs: runtime.runs,
    });
    await processDueWorkflowRuns({ deps: runtime });

    expect(actionCalls).toBe(0);
    expect(runtime.runs.runs[0]?.status).toBe("DEAD_LETTER");
  });

  it("skips a disabled automation id without running the action", async () => {
    let actionCalls = 0;
    const runtime = deps({
      policy: l4Policy({ disabledAutomations: ["test.execute"] }),
    });
    const workflow = executeWorkflow({
      async action() {
        actionCalls += 1;
        return { executed: true };
      },
    });
    registerWorkflow(workflow);

    await enqueueWorkflowRun({
      workflow,
      event: event({
        eventType: "AttentionDismissed",
        aggregateId: "att-off",
      }),
      runs: runtime.runs,
    });
    await processDueWorkflowRuns({ deps: runtime });

    expect(actionCalls).toBe(0);
    expect(runtime.runs.runs[0]?.status).toBe("SKIPPED");
    expect(runtime.runs.runs[0]?.result.skipReason).toBe("automation_disabled");
  });

  it("retries a transient failure then dead-letters after max attempts", async () => {
    const runtime = deps({ policy: l4Policy() });
    const workflow = executeWorkflow({
      async action() {
        throw new Error("temporary");
      },
    });
    registerWorkflow(workflow);

    await enqueueWorkflowRun({
      workflow,
      event: event({
        eventType: "AttentionDismissed",
        aggregateId: "att-retry",
      }),
      runs: runtime.runs,
    });

    for (let attempt = 1; attempt < WORKFLOW_MAX_ATTEMPTS; attempt += 1) {
      const now = new Date(Date.now() + attempt * 60_000);
      const result = await processDueWorkflowRuns({ deps: runtime, now });
      expect(result.failed).toBe(1);
      expect(runtime.runs.runs[0]?.status).toBe("RETRY");
    }

    const last = await processDueWorkflowRuns({
      deps: runtime,
      now: new Date(Date.now() + 24 * 60 * 60_000),
    });
    expect(last.failed).toBe(1);
    expect(runtime.runs.runs[0]?.status).toBe("DEAD_LETTER");
    expect(runtime.runs.runs[0]?.attemptCount).toBe(WORKFLOW_MAX_ATTEMPTS);
  });

  it("does not claim a second run while another with the same concurrency key is RUNNING", async () => {
    const runs = createMemoryWorkflowRunRepository();
    const workflow = createNoopProofWorkflow();
    await enqueueWorkflowRun({
      workflow,
      event: event({
        id: "evt-1",
        eventType: "AttentionDismissed",
        aggregateId: "same-item",
      }),
      runs,
    });
    await enqueueWorkflowRun({
      workflow,
      event: event({
        id: "evt-2",
        eventType: "AttentionDismissed",
        aggregateId: "same-item",
      }),
      runs,
    });

    const first = await runs.claimDue({ now: new Date(), limit: 10 });
    expect(first).toHaveLength(1);
    const second = await runs.claimDue({ now: new Date(), limit: 10 });
    expect(second).toHaveLength(0);
  });
});
