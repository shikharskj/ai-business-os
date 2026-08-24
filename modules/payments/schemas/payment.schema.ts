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

export const paymentAllocationInputSchema = z.object({
  invoiceId: z.string().uuid("Select an invoice"),
  amount: positiveMoneyInputSchema,
});

export const recordCustomerPaymentSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  receivedOn: businessDateSchema,
  method: z.enum(PAYMENT_METHODS, { message: "Select a payment method" }),
  amount: positiveMoneyInputSchema,
  reference: optionalText,
  notes: optionalText,
  allocations: z.array(paymentAllocationInputSchema).default([]),
});

export const applyCustomerAdvanceSchema = z.object({
  paymentId: z.string().uuid("Payment was not found."),
  allocations: z
    .array(paymentAllocationInputSchema)
    .min(1, "Allocate the credit to at least one invoice"),
});

export const applyCustomerCreditSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  allocations: z
    .array(paymentAllocationInputSchema)
    .min(1, "Allocate the credit to at least one invoice"),
});

export type ApplyCustomerAdvanceFormInput = z.infer<typeof applyCustomerAdvanceSchema>;
export type ApplyCustomerCreditFormInput = z.infer<typeof applyCustomerCreditSchema>;

export function toAdvanceAllocationFields(
  input: ApplyCustomerAdvanceFormInput | ApplyCustomerCreditFormInput
) {
  return {
    allocations: input.allocations.map((allocation) => ({
      invoiceId: allocation.invoiceId,
      amount: moneyFromMajor(allocation.amount),
    })),
  };
}

export type RecordCustomerPaymentFormInput = z.infer<typeof recordCustomerPaymentSchema>;

export function toPaymentFields(input: RecordCustomerPaymentFormInput) {
  return {
    customerId: input.customerId,
    receivedOn: businessDate(input.receivedOn),
    method: input.method,
    amount: moneyFromMajor(input.amount),
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    allocations: input.allocations.map((allocation) => ({
      invoiceId: allocation.invoiceId,
      amount: moneyFromMajor(allocation.amount),
    })),
  };
}

export const paymentSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  customerId: z.string().uuid().optional(),
  method: z.enum(["ALL", ...PAYMENT_METHODS]).optional().default("ALL"),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
