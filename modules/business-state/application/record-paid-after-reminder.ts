import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import {
  overdueReceivableNaturalKey,
  paidAfterReminderIdempotencyKey,
} from "@/modules/business-state/domain/attention-keys";
import { recordAutomationOutcome } from "@/modules/business-state/application/record-outcome";

/**
 * When a payment allocates to invoices that previously had a reminder sent,
 * record PAID_AFTER_REMINDER. Stub for later collections learning.
 */
export async function recordPaidAfterReminderOutcomes(input: {
  tenantId: string;
  paymentId: string;
  invoiceIds: string[];
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
}): Promise<number> {
  const invoiceIds = [...new Set(input.invoiceIds.filter((id) => id.length > 0))];
  if (invoiceIds.length === 0) {
    return 0;
  }

  const reminderOutcomes = await input.attention.listOutcomes({
    tenantId: input.tenantId,
    kind: "REMINDER_SENT",
    resourceType: "SalesInvoice",
    resourceIds: invoiceIds,
  });
  const reminded = new Set(
    reminderOutcomes
      .map((row) => row.resourceId)
      .filter((id): id is string => Boolean(id))
  );

  let recorded = 0;
  for (const invoiceId of invoiceIds) {
    if (!reminded.has(invoiceId)) continue;
    const attentionItem = await input.attention.findByNaturalKey(
      input.tenantId,
      overdueReceivableNaturalKey(invoiceId)
    );
    const result = await recordAutomationOutcome({
      tenantId: input.tenantId,
      kind: "PAID_AFTER_REMINDER",
      idempotencyKey: paidAfterReminderIdempotencyKey(
        invoiceId,
        input.paymentId
      ),
      attentionItemId: attentionItem?.id ?? null,
      resourceType: "SalesInvoice",
      resourceId: invoiceId,
      payload: { paymentId: input.paymentId },
      attention: input.attention,
      outbox: input.outbox,
    });
    if (result.created) recorded += 1;
  }

  return recorded;
}

export function invoiceIdsFromPaymentPayload(
  payload: Record<string, unknown>
): string[] {
  const raw = payload.invoiceIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}
