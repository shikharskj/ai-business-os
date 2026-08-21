import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type {
  AttentionQueueRepository,
  RecordAutomationOutcomeInput,
} from "@/modules/business-state/domain/attention-repository";
import type { AutomationOutcome } from "@/modules/business-state/domain/types";

/**
 * Persist an automation/attention outcome row. Idempotent on
 * (tenantId, idempotencyKey). Emits AutomationOutcomeRecorded on first insert.
 */
export async function recordAutomationOutcome(input: RecordAutomationOutcomeInput & {
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
  correlationId?: string;
}): Promise<{ created: boolean; outcome: AutomationOutcome }> {
  const result = await input.attention.recordOutcome({
    tenantId: input.tenantId,
    kind: input.kind,
    idempotencyKey: input.idempotencyKey,
    attentionItemId: input.attentionItemId ?? null,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    payload: input.payload ?? {},
  });

  if (result.created && input.outbox) {
    await persistDomainEvent(input.outbox, {
      tenantId: input.tenantId,
      eventType: "AutomationOutcomeRecorded",
      aggregateType: "AutomationRun",
      aggregateId: result.outcome.id,
      payload: {
        outcome: input.kind,
        attentionItemId: result.outcome.attentionItemId ?? undefined,
        resourceType: result.outcome.resourceType ?? undefined,
        resourceId: result.outcome.resourceId ?? undefined,
        idempotencyKey: input.idempotencyKey,
      },
      correlationId: input.correlationId,
    });
  }

  return result;
}
