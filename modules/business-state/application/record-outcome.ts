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
