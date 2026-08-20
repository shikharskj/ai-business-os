import { z } from "zod";

import { businessDateSchema, positiveMoneyInputSchema } from "@/modules/shared-kernel/schemas";
import { businessDate } from "@/modules/shared-kernel/dates";
import { moneyFromMajor } from "@/modules/shared-kernel/money";
import { PAYMENT_METHODS } from "@/modules/payments/domain/types";
import { COMMON_GST_RATE_BPS } from "@/modules/tax/domain/types";
import { EXPENSE_CATEGORIES } from "@/modules/expenses/domain/types";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    "GSTIN must be a valid 15-character GSTIN"
  );

export const recordExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { message: "Select a category" }),
  incurredOn: businessDateSchema,
  method: z.enum(PAYMENT_METHODS, { message: "Select a payment method" }),
  amount: positiveMoneyInputSchema,
  taxRateBps: z.coerce
    .number()
    .refine(
      (value) => COMMON_GST_RATE_BPS.includes(value as (typeof COMMON_GST_RATE_BPS)[number]),
      { message: "Select a GST rate" }
    )
    .optional()
    .default(0),
  vendorGstin: optionalText.refine(
    (value) => value === undefined || gstinSchema.safeParse(value).success,
    { message: "GSTIN must be a valid 15-character GSTIN" }
  ),
  notes: optionalText,
});

export type RecordExpenseFormInput = z.infer<typeof recordExpenseSchema>;

export function toExpenseFields(input: RecordExpenseFormInput) {
  return {
    category: input.category,
    incurredOn: businessDate(input.incurredOn),
    method: input.method,
    amount: moneyFromMajor(input.amount),
    taxRateBps: input.taxRateBps,
    vendorGstin: input.vendorGstin ?? null,
    notes: input.notes ?? null,
  };
}

export const expenseSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  category: z.enum(["ALL", ...EXPENSE_CATEGORIES]).optional().default("ALL"),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
