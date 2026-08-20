import { z } from "zod";

import { businessDateSchema } from "@/modules/shared-kernel/schemas";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, moneyFromMajor } from "@/modules/shared-kernel/money";
import type { JournalLineDraft } from "@/modules/accounting/domain/types";

const periodKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Select a valid period (YYYY-MM)");

export const journalSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  period: periodKeySchema.optional(),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});

export const ledgerSearchSchema = z.object({
  accountId: z.string().uuid("Select an account"),
  period: periodKeySchema.optional(),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});

export const trialBalanceSearchSchema = z.object({
  period: periodKeySchema,
});

export const closePeriodSchema = z.object({
  periodKey: periodKeySchema,
});

const adjustmentLineSchema = z.object({
  accountCode: z.string().min(1, "Select an account"),
  description: z.string().trim().optional(),
  debit: z.string().trim().optional().default("0"),
  credit: z.string().trim().optional().default("0"),
});

export const postAdjustmentSchema = z.object({
  accountingDate: businessDateSchema,
  memo: z.string().trim().optional(),
  lines: z
    .array(adjustmentLineSchema)
    .transform((lines) =>
      lines.filter((line) => {
        const debit = parseLineAmount(line.debit);
        const credit = parseLineAmount(line.credit);
        return debit.amountMinor > 0n || credit.amountMinor > 0n;
      })
    )
    .refine((lines) => lines.length >= 2, {
      message: "Add at least two journal lines",
    }),
});

export type PostAdjustmentFormInput = z.infer<typeof postAdjustmentSchema>;

function parseLineAmount(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "." || trimmed === "0" || trimmed === "0.00") {
    return money(0n);
  }
  return moneyFromMajor(trimmed);
}

export function toAdjustmentLines(input: PostAdjustmentFormInput): {
  accountingDate: ReturnType<typeof businessDate>;
  memo: string | null;
  lines: JournalLineDraft[];
} {
  const lines: JournalLineDraft[] = input.lines.map((line) => ({
    accountCode: line.accountCode.trim(),
    description: line.description?.trim() || undefined,
    debit: parseLineAmount(line.debit),
    credit: parseLineAmount(line.credit),
  }));

  return {
    accountingDate: businessDate(input.accountingDate),
    memo: input.memo?.trim() ? input.memo.trim() : null,
    lines,
  };
}

export const reverseJournalSchema = z.object({
  journalId: z.string().uuid(),
  accountingDate: businessDateSchema,
});
