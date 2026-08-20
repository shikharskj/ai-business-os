import { z } from "zod";

import { businessDateSchema } from "@/modules/shared-kernel/schemas";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { INVENTORY_MOVEMENT_DIRECTIONS } from "@/modules/inventory/domain/types";

export const quantityInputSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/,/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^\d{1,14}(\.\d{1,4})?$/,
        "Enter a valid quantity (up to 4 decimal places)"
      )
  );

export const positiveQuantityInputSchema = quantityInputSchema.refine(
  (value) => quantityFromMajor(value).amountMinor > 0n,
  { message: "Quantity must be greater than zero" }
);

export const nonNegativeQuantityInputSchema = quantityInputSchema.refine(
  (value) => quantityFromMajor(value).amountMinor >= 0n,
  { message: "Quantity cannot be negative" }
);

export const openingStockInputSchema = z.object({
  productId: z.string().uuid("Select a valid product"),
  quantity: positiveQuantityInputSchema,
  occurredOn: businessDateSchema,
  reason: z
    .string()
    .trim()
    .max(200, "Reason must be at most 200 characters")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export const adjustStockInputSchema = z.object({
  productId: z.string().uuid("Select a valid product"),
  direction: z.enum(INVENTORY_MOVEMENT_DIRECTIONS, {
    message: "Choose whether to add or remove stock",
  }),
  quantity: positiveQuantityInputSchema,
  occurredOn: businessDateSchema,
  reason: z
    .string()
    .trim()
    .min(2, "Explain why this adjustment is needed")
    .max(200, "Reason must be at most 200 characters"),
});

export const stockSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  stock: z.enum(["ALL", "LOW"]).optional().default("ALL"),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});

export type OpeningStockFormInput = z.infer<typeof openingStockInputSchema>;
export type AdjustStockFormInput = z.infer<typeof adjustStockInputSchema>;
