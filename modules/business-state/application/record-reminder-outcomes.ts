import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import {
  overdueReceivableNaturalKey,
  reminderProposedIdempotencyKey,
  reminderSentIdempotencyKey,
} from "@/modules/business-state/domain/attention-keys";
import { recordAutomationOutcome } from "@/modules/business-state/application/record-outcome";

/**
 * Learning stubs for collections: a confirmed reminder was proposed, and
 * optionally delivered. Does not send messages itself.
 */
export async function recordPaymentReminderOutcomes(input: {
  tenantId: string;
  invoiceId: string;
  asOf: string;
  delivered: boolean;
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
}): Promise<void> {
  const attentionItem = await input.attention.findByNaturalKey(
    input.tenantId,
    overdueReceivableNaturalKey(input.invoiceId)
  );

  await recordAutomationOutcome({
    tenantId: input.tenantId,
    kind: "REMINDER_PROPOSED",
    idempotencyKey: reminderProposedIdempotencyKey(
      input.invoiceId,
      input.asOf
    ),
    attentionItemId: attentionItem?.id ?? null,
    resourceType: "SalesInvoice",
    resourceId: input.invoiceId,
    attention: input.attention,
    outbox: input.outbox,
  });

  if (!input.delivered) return;

  await recordAutomationOutcome({
    tenantId: input.tenantId,
    kind: "REMINDER_SENT",
    idempotencyKey: reminderSentIdempotencyKey(input.invoiceId, input.asOf),
    attentionItemId: attentionItem?.id ?? null,
    resourceType: "SalesInvoice",
    resourceId: input.invoiceId,
    attention: input.attention,
    outbox: input.outbox,
  });
}
