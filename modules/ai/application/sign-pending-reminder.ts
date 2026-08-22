import {
  AI_ACTION_TOKEN_TTL_MS,
  signAiActionToken,
} from "@/modules/ai/domain/action-token";
import { previewAiAction } from "@/modules/ai/domain/assistant-actions";
import type { AiAssistantPendingAction } from "@/modules/ai/domain/assistant-types";
import type { AiToolName } from "@/modules/ai/domain/tool-types";
import { paymentRemindersInputSchema } from "@/modules/ai/schemas/ai-tool.schema";

export type SignedPendingPaymentReminder = AiAssistantPendingAction & {
  token: string;
};

/**
 * Signs a payment-reminder proposal from invoice ids already produced by a
 * tool or attention row. Does not run the tool — confirm still goes through
 * the existing confirm gate.
 */
export function signPendingPaymentReminder(input: {
  tenantId: string;
  actorUserId: string;
  invoiceIds: string[];
  secret: string;
  now?: number;
}): SignedPendingPaymentReminder | null {
  const parsed = paymentRemindersInputSchema.safeParse({
    invoiceIds: input.invoiceIds,
  });
  if (!parsed.success) {
    return null;
  }

  const proposal = previewAiAction({
    toolName: "send_payment_reminders",
    input: parsed.data,
  });
  if (!proposal) {
    return null;
  }

  const toolName = "send_payment_reminders" as AiToolName;
  const argumentsJson = JSON.stringify(parsed.data);
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
