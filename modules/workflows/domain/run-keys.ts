import type { OutboxEventRecord } from "@/modules/events/domain/types";
import type { WorkflowDefinition } from "@/modules/workflows/domain/types";

export function workflowIdempotencyKey(
  workflow: WorkflowDefinition,
  event: OutboxEventRecord
): string {
  return workflow.idempotencyKey?.(event) ?? `${workflow.id}:${event.id}`;
}

export function workflowConcurrencyKey(
  workflow: WorkflowDefinition,
  event: OutboxEventRecord
): string {
  return (
    workflow.concurrencyKey?.(event) ?? `${workflow.id}:${event.aggregateId}`
  );
}

export function workflowAcceptsEvent(
  workflow: WorkflowDefinition,
  event: OutboxEventRecord
): boolean {
  if (workflow.eventTypes.length > 0 && !workflow.eventTypes.includes(event.eventType)) {
    return false;
  }
  if (workflow.accepts && !workflow.accepts(event)) {
    return false;
  }
  return true;
}
