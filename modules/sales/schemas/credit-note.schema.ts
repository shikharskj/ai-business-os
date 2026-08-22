import { z } from "zod";

import { businessDateSchema } from "@/modules/shared-kernel/schemas";
import { businessDate } from "@/modules/shared-kernel/dates";
import { positiveQuantityInputSchema } from "@/modules/inventory/schemas/inventory.schema";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { CREDIT_NOTE_STATUSES } from "@/modules/sales/domain/types";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const creditNoteLineInputSchema = z.object({
  invoiceLineId: z.string().uuid("Select an invoice line"),
  quantity: positiveQuantityInputSchema,
});

export const creditNoteInputSchema = z.object({
  invoiceId: z.string().uuid("Select an invoice"),
  issuedOn: businessDateSchema,
  notes: optionalText,
  lines: z.array(creditNoteLineInputSchema).min(1, "Add at least one line to credit"),
});

export type CreditNoteFormInput = z.infer<typeof creditNoteInputSchema>;

export function toCreditNoteFields(input: CreditNoteFormInput) {
  return {
    invoiceId: input.invoiceId,
    issuedOn: businessDate(input.issuedOn),
    notes: input.notes ?? null,
    lines: input.lines.map((line) => ({
      invoiceLineId: line.invoiceLineId,
      quantity: quantityFromMajor(line.quantity),
    })),
  };
}

export const creditNoteSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["ALL", ...CREDIT_NOTE_STATUSES]).optional().default("ALL"),
  customerId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
