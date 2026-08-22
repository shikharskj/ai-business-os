import { z } from "zod";

import { businessDateSchema } from "@/modules/shared-kernel/schemas";
import { businessDate } from "@/modules/shared-kernel/dates";
import { moneyFromMajor } from "@/modules/shared-kernel/money";
import { isGstStateCode } from "@/modules/tax/domain/gstin";
import { positiveQuantityInputSchema } from "@/modules/inventory/schemas/inventory.schema";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { SALES_ORDER_STATUSES } from "@/modules/sales/domain/types";
import { quotationLineInputSchema } from "@/modules/sales/schemas/quotation.schema";

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

export const salesOrderLineInputSchema = quotationLineInputSchema;

export const salesOrderInputSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  issuedOn: businessDateSchema,
  expectedOn: optionalDate,
  notes: optionalText,
  placeOfSupplyStateCode: z
    .string()
    .trim()
    .min(1, "Select a place of supply")
    .refine(isGstStateCode, "Select a valid Indian state for place of supply"),
  lines: z.array(salesOrderLineInputSchema).min(1, "Add at least one line"),
});

export type SalesOrderFormInput = z.infer<typeof salesOrderInputSchema>;

export function toSalesOrderFields(input: SalesOrderFormInput) {
  return {
    customerId: input.customerId,
    issuedOn: businessDate(input.issuedOn),
    expectedOn: input.expectedOn ? businessDate(input.expectedOn) : null,
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

export const salesOrderSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["ALL", ...SALES_ORDER_STATUSES]).optional().default("ALL"),
  customerId: z.string().uuid().optional(),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
