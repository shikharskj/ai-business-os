import {
  AI_ACTION_TOKEN_TTL_MS,
  signAiActionToken,
} from "@/modules/ai/domain/action-token";
import { previewAiAction } from "@/modules/ai/domain/assistant-actions";
import type { AiAssistantPendingAction } from "@/modules/ai/domain/assistant-types";
import type { AiToolName } from "@/modules/ai/domain/tool-types";
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

  const toolInput = { invoiceIds: [item.resourceId] };
  const proposal = previewAiAction({
    toolName: "send_payment_reminders",
    input: toolInput,
  });
  if (!proposal) {
    throw new Error("Could not prepare payment reminder preview.");
  }

  const toolName = "send_payment_reminders" as AiToolName;
  const argumentsJson = JSON.stringify(toolInput);
  const now = input.now ?? Date.now();
  const pending: AiAssistantPendingAction = {
    toolName,
    title: proposal.title,
    summary: proposal.summary,
    impact: proposal.impact,
    fields: proposal.fields,
    argumentsJson,
  };

  return {
    ...pending,
    token: signAiActionToken({
      secret: input.secret,
      payload: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        toolName,
        argumentsJson,
        expiresAt: now + AI_ACTION_TOKEN_TTL_MS,
      },
    }),
  };
}
