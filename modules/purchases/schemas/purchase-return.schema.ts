import { z } from "zod";

import { businessDateSchema } from "@/modules/shared-kernel/schemas";
import { businessDate } from "@/modules/shared-kernel/dates";
import { positiveQuantityInputSchema } from "@/modules/inventory/schemas/inventory.schema";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { PURCHASE_RETURN_STATUSES } from "@/modules/purchases/domain/types";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const purchaseReturnLineInputSchema = z.object({
  purchaseLineId: z.string().uuid("Select a purchase line"),
  quantity: positiveQuantityInputSchema,
});

export const purchaseReturnInputSchema = z.object({
  purchaseId: z.string().uuid("Select a purchase bill"),
  issuedOn: businessDateSchema,
  notes: optionalText,
  lines: z
    .array(purchaseReturnLineInputSchema)
    .min(1, "Add at least one line to return"),
});

export type PurchaseReturnFormInput = z.infer<typeof purchaseReturnInputSchema>;

export function toPurchaseReturnFields(input: PurchaseReturnFormInput) {
  return {
    purchaseId: input.purchaseId,
    issuedOn: businessDate(input.issuedOn),
    notes: input.notes ?? null,
    lines: input.lines.map((line) => ({
      purchaseLineId: line.purchaseLineId,
      quantity: quantityFromMajor(line.quantity),
    })),
  };
}

export const purchaseReturnSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["ALL", ...PURCHASE_RETURN_STATUSES]).optional().default("ALL"),
  supplierId: z.string().uuid().optional(),
  purchaseId: z.string().uuid().optional(),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
