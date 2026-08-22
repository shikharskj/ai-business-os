import { signPendingPaymentReminder } from "@/modules/ai/application/sign-pending-reminder";
import type { AiAssistantPendingAction } from "@/modules/ai/domain/assistant-types";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import {
  AttentionItemNotFoundError,
  AttentionTenantMismatchError,
} from "@/modules/business-state/domain/errors";

export type ProposeBriefReminderInput = {
  tenantId: string;
  actorUserId: string;
  attentionItemId: string;
  secret: string;
  attention: AttentionQueueRepository;
  now?: number;
};

export type ProposeBriefReminderResult = AiAssistantPendingAction & {
  token: string;
};

/**
 * Builds a signed payment-reminder proposal from an overdue AttentionQueue row.
 * Does not run the tool — confirm still goes through the existing confirm gate.
 */
export async function proposeBriefPaymentReminder(
  input: ProposeBriefReminderInput
): Promise<ProposeBriefReminderResult> {
  const item = await input.attention.findById(
    input.tenantId,
    input.attentionItemId
  );
  if (!item) {
    throw new AttentionItemNotFoundError();
  }
  if (item.tenantId !== input.tenantId) {
    throw new AttentionTenantMismatchError();
  }
  if (item.type !== "OVERDUE_RECEIVABLE") {
    throw new AttentionItemNotFoundError();
  }
  if (item.status !== "OPEN") {
    throw new AttentionItemNotFoundError();
  }

  const pending = signPendingPaymentReminder({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    invoiceIds: [item.resourceId],
    secret: input.secret,
    now: input.now,
  });
  if (!pending) {
    throw new Error("Could not prepare payment reminder preview.");
  }

  return pending;
}
