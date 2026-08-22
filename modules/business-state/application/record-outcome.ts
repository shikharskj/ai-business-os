import type { PrismaClient } from "@/generated/prisma/client";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type {
  AttentionQueueRepository,
  RecordAutomationOutcomeInput,
} from "@/modules/business-state/domain/attention-repository";
import type { AutomationOutcome } from "@/modules/business-state/domain/types";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";

function automationOutcomeEventPayload(input: {
  kind: string;
  idempotencyKey: string;
  attentionItemId: string | null;
  resourceType: string | null;
  resourceId: string | null;
}): Record<string, unknown> {
  return {
    outcome: input.kind,
    idempotencyKey: input.idempotencyKey,
    ...(input.attentionItemId
      ? { attentionItemId: input.attentionItemId }
      : {}),
    ...(input.resourceType ? { resourceType: input.resourceType } : {}),
    ...(input.resourceId ? { resourceId: input.resourceId } : {}),
  };
}

/**
 * Persist an automation/attention outcome row. Idempotent on
 * (tenantId, idempotencyKey). Emits AutomationOutcomeRecorded on first insert.
 */
export async function recordAutomationOutcome(input: RecordAutomationOutcomeInput & {
  attention?: AttentionQueueRepository;
  outbox?: OutboxRepository;
  prisma?: PrismaClient;
  correlationId?: string;
}): Promise<{ created: boolean; outcome: AutomationOutcome }> {
  // If prisma client is provided, use transaction
  if (input.prisma) {
    return input.prisma.$transaction(async (tx) => {
      const attention = createPrismaAttentionQueueRepository(tx);
      const outbox = createPrismaOutboxRepository(tx);

      const result = await attention.recordOutcome({
        tenantId: input.tenantId,
        kind: input.kind,
        idempotencyKey: input.idempotencyKey,
        attentionItemId: input.attentionItemId ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        payload: input.payload ?? {},
      });

      if (result.created) {
        await persistDomainEvent(outbox, {
          tenantId: input.tenantId,
          eventType: "AutomationOutcomeRecorded",
          aggregateType: "AutomationRun",
          aggregateId: result.outcome.id,
          payload: automationOutcomeEventPayload({
            kind: input.kind,
            idempotencyKey: input.idempotencyKey,
            attentionItemId: result.outcome.attentionItemId,
            resourceType: result.outcome.resourceType,
            resourceId: result.outcome.resourceId,
          }),
          correlationId: input.correlationId,
        });
      }

      return result;
    });
  }

  // Fallback for tests that pass repositories directly
  if (!input.attention) {
    throw new Error("Either prisma or attention repository must be provided");
  }

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
      payload: automationOutcomeEventPayload({
        kind: input.kind,
        idempotencyKey: input.idempotencyKey,
        attentionItemId: result.outcome.attentionItemId,
        resourceType: result.outcome.resourceType,
        resourceId: result.outcome.resourceId,
      }),
      correlationId: input.correlationId,
    });
  }

  return result;
}
