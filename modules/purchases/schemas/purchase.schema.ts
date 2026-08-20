import { z } from "zod";

import { businessDateSchema, moneyInputSchema } from "@/modules/shared-kernel/schemas";
import { businessDate } from "@/modules/shared-kernel/dates";
import { moneyFromMajor } from "@/modules/shared-kernel/money";
import { isGstStateCode } from "@/modules/tax/domain/gstin";
import { positiveQuantityInputSchema } from "@/modules/inventory/schemas/inventory.schema";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { PURCHASE_STATUSES } from "@/modules/purchases/domain/types";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .pipe(businessDateSchema.optional());

const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : "0"));

const optionalUnitPrice = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const purchaseLineInputSchema = z.object({
  productId: z.string().uuid("Select a product or service"),
  quantity: positiveQuantityInputSchema,
  unitPrice: optionalUnitPrice.pipe(moneyInputSchema.optional()),
  discount: optionalMoney.pipe(moneyInputSchema),
});

export const purchaseInputSchema = z.object({
  supplierId: z.string().uuid("Select a supplier"),
  issuedOn: businessDateSchema,
  dueOn: optionalDate,
  notes: optionalText,
  placeOfSupplyStateCode: z
    .string()
    .trim()
    .min(1, "Select a place of supply")
    .refine(isGstStateCode, "Select a valid Indian state for place of supply"),
  lines: z.array(purchaseLineInputSchema).min(1, "Add at least one line"),
});

export type PurchaseFormInput = z.infer<typeof purchaseInputSchema>;

export function toPurchaseFields(
  input: PurchaseFormInput,
  currency: string = "INR"
) {
  return {
    supplierId: input.supplierId,
    issuedOn: businessDate(input.issuedOn),
    dueOn: input.dueOn ? businessDate(input.dueOn) : null,
    notes: input.notes ?? null,
    placeOfSupplyStateCode: input.placeOfSupplyStateCode,
    lines: input.lines.map((line) => ({
      productId: line.productId,
      quantity: quantityFromMajor(line.quantity),
      unitPrice: line.unitPrice !== undefined ? moneyFromMajor(line.unitPrice, currency) : undefined,
      discount: moneyFromMajor(line.discount, currency),
    })),
  };
}

export const purchaseSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["ALL", ...PURCHASE_STATUSES]).optional().default("ALL"),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
