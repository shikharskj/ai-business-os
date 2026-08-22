import { z } from "zod";

import { normalizeAutonomyAmountMajor } from "@/modules/tenant/domain/autonomy-policy";

const amountMajorSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount such as 25000 or 25000.00")
  .transform(normalizeAutonomyAmountMajor);

const optionalAmountMajorSchema = z.preprocess(
  (value) => {
    if (value == null) {
      return undefined;
    }
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  },
  amountMajorSchema.optional()
);

export const autonomyPolicyUpdateSchema = z
  .object({
    enablePaymentReminderL4: z.boolean(),
    paymentReminderAmountThreshold: optionalAmountMajorSchema,
    paymentReminderRequireConfirmationAbove: optionalAmountMajorSchema,
    disabledAutomations: z.array(z.string().min(1).max(80)).max(50).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.enablePaymentReminderL4 &&
      value.paymentReminderAmountThreshold === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentReminderAmountThreshold"],
        message:
          "Set a maximum outstanding amount before enabling automatic reminders.",
      });
    }
  })
  .transform((value) => {
    const allowedActionClasses = value.enablePaymentReminderL4
      ? (["payment_reminder"] as const)
      : [];
    const amountThresholds: { payment_reminder?: string } = {};
    const requireConfirmationAbove: { payment_reminder?: string } = {};

    if (value.paymentReminderAmountThreshold) {
      amountThresholds.payment_reminder = value.paymentReminderAmountThreshold;
    }
    if (value.paymentReminderRequireConfirmationAbove) {
      requireConfirmationAbove.payment_reminder =
        value.paymentReminderRequireConfirmationAbove;
    }

    return {
      allowedActionClasses: [...allowedActionClasses],
      amountThresholds,
      requireConfirmationAbove,
      disabledAutomations: value.disabledAutomations,
    };
  });

export type AutonomyPolicyUpdateInput = z.input<
  typeof autonomyPolicyUpdateSchema
>;
export type AutonomyPolicyUpdateParsed = z.output<
  typeof autonomyPolicyUpdateSchema
>;
