import { z } from "zod";

import { businessDateSchema, positiveMoneyInputSchema } from "@/modules/shared-kernel/schemas";
import { businessDate } from "@/modules/shared-kernel/dates";
import { moneyFromMajor } from "@/modules/shared-kernel/money";
import { PAYMENT_METHODS } from "@/modules/payments/domain/types";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const supplierPaymentAllocationInputSchema = z.object({
  purchaseId: z.string().uuid("Select a purchase bill"),
  amount: positiveMoneyInputSchema,
});

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.string().uuid("Select a supplier"),
  paidOn: businessDateSchema,
  method: z.enum(PAYMENT_METHODS, { message: "Select a payment method" }),
  amount: positiveMoneyInputSchema,
  reference: optionalText,
  notes: optionalText,
  allocations: z
    .array(supplierPaymentAllocationInputSchema)
    .min(1, "Allocate the payment to at least one purchase bill"),
});

export type RecordSupplierPaymentFormInput = z.infer<typeof recordSupplierPaymentSchema>;

export function toSupplierPaymentFields(input: RecordSupplierPaymentFormInput) {
  return {
    supplierId: input.supplierId,
    paidOn: businessDate(input.paidOn),
    method: input.method,
    amount: moneyFromMajor(input.amount),
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    allocations: input.allocations.map((allocation) => ({
      purchaseId: allocation.purchaseId,
      amount: moneyFromMajor(allocation.amount),
    })),
  };
}

export const supplierPaymentSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  supplierId: z.string().uuid().optional(),
  method: z.enum(["ALL", ...PAYMENT_METHODS]).optional().default("ALL"),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
