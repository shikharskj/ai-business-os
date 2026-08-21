import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import { dismissOutcomeIdempotencyKey } from "@/modules/business-state/domain/attention-keys";
import {
  AttentionItemNotFoundError,
  AttentionTenantMismatchError,
} from "@/modules/business-state/domain/errors";
import type { AttentionItem } from "@/modules/business-state/domain/types";
import { recordAutomationOutcome } from "@/modules/business-state/application/record-outcome";

/**
 * Dismiss an attention item. Idempotent. Does not mutate invoices or stock.
 */
export async function dismissAttentionItem(input: {
  tenantId: string;
  actorUserId: string;
  attentionItemId: string;
  attention: AttentionQueueRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
  correlationId?: string;
}): Promise<{ item: AttentionItem; alreadyDismissed: boolean }> {
  const existing = await input.attention.findById(
    input.tenantId,
    input.attentionItemId
  );
  if (!existing || existing.tenantId !== input.tenantId) {
    throw existing
      ? new AttentionTenantMismatchError()
      : new AttentionItemNotFoundError();
  }

  const dismissedAt = new Date();
  const result = await input.attention.dismiss({
    tenantId: input.tenantId,
    id: input.attentionItemId,
    dismissedByUserId: input.actorUserId,
    dismissedAt,
  });
  if (!result || result.item.tenantId !== input.tenantId) {
    throw new AttentionItemNotFoundError();
  }

  const alreadyDismissed = result.previousStatus === "DISMISSED";
  const item = result.item;

  if (!alreadyDismissed) {
    await input.audit.append({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "attention.dismissed",
      resource: "attention_item",
      resourceId: item.id,
      metadata: {
        type: item.type,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
      },
      correlationId: input.correlationId,
    });

    await persistDomainEvent(input.outbox, {
      tenantId: input.tenantId,
      eventType: "AttentionDismissed",
      aggregateType: "AttentionItem",
      aggregateId: item.id,
      payload: {
        attentionItemId: item.id,
        type: item.type,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
      },
      correlationId: input.correlationId,
    });
  }

  await recordAutomationOutcome({
    tenantId: input.tenantId,
    kind: "ATTENTION_DISMISSED",
    idempotencyKey: dismissOutcomeIdempotencyKey(item.id),
    attentionItemId: item.id,
    resourceType: item.resourceType,
    resourceId: item.resourceId,
    payload: {
      type: item.type,
      alreadyDismissed,
    },
    attention: input.attention,
    outbox: input.outbox,
    correlationId: input.correlationId,
  });

  return { item, alreadyDismissed };
}
