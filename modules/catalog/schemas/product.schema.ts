import { z } from "zod";

import { businessDateSchema, moneyInputSchema } from "@/modules/shared-kernel/schemas";
import { moneyFromMajor } from "@/modules/shared-kernel/money";
import { COMMON_GST_RATE_BPS } from "@/modules/tax/domain/types";
import { CATALOG_UNITS } from "@/modules/catalog/domain/types";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const productInputSchema = z
  .object({
    kind: z.enum(["PRODUCT", "SERVICE"]),
    name: z.string().trim().min(2, "Product name is required"),
    sku: z.string().trim().min(1, "SKU / item code is required"),
    unitOfMeasurement: z.enum(CATALOG_UNITS, {
      message: "Select a valid unit of measurement",
    }),
    sellingPrice: moneyInputSchema,
    purchasePrice: moneyInputSchema,
    hsnSac: optionalText,
    taxRateBps: z.coerce.number().refine(
      (value) => COMMON_GST_RATE_BPS.includes(value as (typeof COMMON_GST_RATE_BPS)[number]),
      "Select a valid GST rate"
    ),
    category: optionalText,
    tracksInventory: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((value) => value === true || value === "true" || value === "on"),
  })
  .transform((value) => ({
    kind: value.kind,
    name: value.name,
    sku: value.sku,
    unitOfMeasurement: value.unitOfMeasurement,
    sellingPrice: moneyFromMajor(value.sellingPrice),
    purchasePrice: moneyFromMajor(value.purchasePrice),
    hsnSac: value.hsnSac,
    taxRateBps: value.taxRateBps,
    category: value.category,
    tracksInventory: value.kind === "SERVICE" ? false : value.tracksInventory,
  }));

export type ProductFormInput = z.infer<typeof productInputSchema>;

export const productSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  kind: z.enum(["PRODUCT", "SERVICE", "ALL"]).optional().default("ALL"),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
});
