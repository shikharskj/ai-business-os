import { z } from "zod";

import { businessDateSchema, moneyInputSchema } from "@/modules/shared-kernel/schemas";
import { businessDate } from "@/modules/shared-kernel/dates";
import { moneyFromMajor } from "@/modules/shared-kernel/money";
import { isGstStateCode } from "@/modules/tax/domain/gstin";
import { positiveQuantityInputSchema } from "@/modules/inventory/schemas/inventory.schema";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { QUOTATION_STATUSES } from "@/modules/sales/domain/types";

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

export const quotationLineInputSchema = z.object({
  productId: z.string().uuid("Select a product or service"),
  quantity: positiveQuantityInputSchema,
  unitPrice: optionalUnitPrice.pipe(moneyInputSchema.optional()),
  discount: optionalMoney.pipe(moneyInputSchema),
});

export const quotationInputSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  issuedOn: businessDateSchema,
  validUntil: optionalDate,
  notes: optionalText,
  placeOfSupplyStateCode: z
    .string()
    .trim()
    .min(1, "Select a place of supply")
    .refine(isGstStateCode, "Select a valid Indian state for place of supply"),
  lines: z.array(quotationLineInputSchema).min(1, "Add at least one line"),
});

export type QuotationFormInput = z.infer<typeof quotationInputSchema>;

export function toQuotationFields(input: QuotationFormInput) {
  return {
    customerId: input.customerId,
    issuedOn: businessDate(input.issuedOn),
    validUntil: input.validUntil ? businessDate(input.validUntil) : null,
    notes: input.notes ?? null,
    placeOfSupplyStateCode: input.placeOfSupplyStateCode,
    lines: input.lines.map((line) => ({
      productId: line.productId,
      quantity: quantityFromMajor(line.quantity),
      unitPrice: line.unitPrice !== undefined ? moneyFromMajor(line.unitPrice) : undefined,
      discount: moneyFromMajor(line.discount),
    })),
  };
}

export const quotationSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["ALL", ...QUOTATION_STATUSES]).optional().default("ALL"),
  customerId: z.string().uuid().optional(),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
