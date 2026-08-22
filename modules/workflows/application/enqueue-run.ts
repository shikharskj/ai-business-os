import type { OutboxEventRecord } from "@/modules/events/domain/types";
import type { WorkflowDefinition, WorkflowRun } from "@/modules/workflows/domain/types";
import {
  workflowAcceptsEvent,
  workflowConcurrencyKey,
  workflowIdempotencyKey,
} from "@/modules/workflows/domain/run-keys";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

export async function enqueueWorkflowRun(input: {
  workflow: WorkflowDefinition;
  event: OutboxEventRecord;
  runs: WorkflowRunRepository;
  correlationId?: string | null;
}): Promise<{ created: boolean; run: WorkflowRun | null }> {
  if (!workflowAcceptsEvent(input.workflow, input.event)) {
    return { created: false, run: null };
  }

  const result = await input.runs.createIfAbsent({
    tenantId: input.event.tenantId,
    workflowId: input.workflow.id,
    triggerEventId: input.event.id,
    triggerEventType: input.event.eventType,
    aggregateType: input.event.aggregateType,
    aggregateId: input.event.aggregateId,
    triggerPayload: input.event.payload,
    idempotencyKey: workflowIdempotencyKey(input.workflow, input.event),
    concurrencyKey: workflowConcurrencyKey(input.workflow, input.event),
    correlationId: input.correlationId ?? null,
  });

  return result;
}
