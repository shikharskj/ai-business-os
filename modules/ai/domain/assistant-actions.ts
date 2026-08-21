import { paymentRemindersInputSchema } from "@/modules/ai/schemas/ai-tool.schema";

export type AiActionPreview = {
  title: string;
  summary: string;
  impact: string;
  fields: Array<{ label: string; value: string }>;
};

/**
 * Human-readable preview of a proposed mutation, built from the tool's own
 * validated input. The preview never runs the tool and never reads business
 * data, so producing it cannot change anything.
 *
 * A tool without a preview here is not previewable, and the assistant refuses
 * to propose it rather than showing a vague confirmation.
 */
export function previewAiAction(input: {
  toolName: string;
  input: unknown;
}): AiActionPreview | null {
  if (input.toolName === "send_payment_reminders") {
    const parsed = paymentRemindersInputSchema.safeParse(input.input);
    if (!parsed.success) {
      return null;
    }
    const count = parsed.data.invoiceIds.length;
    return {
      title: `Send ${count} payment reminder${count === 1 ? "" : "s"}`,
      summary: `Notify your team about ${count} overdue invoice${
        count === 1 ? "" : "s"
      }. Each invoice is re-checked on the server before a reminder is created.`,
      impact:
        "Creates reminder notifications only. No invoice, payment, ledger entry, or tax record is changed.",
      fields: [
        { label: "Invoices", value: String(count) },
        { label: "Channel", value: "In-app notification" },
      ],
    };
  }

  return null;
}
