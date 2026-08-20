import { z } from "zod";

import { businessDateSchema } from "@/modules/shared-kernel/schemas";

export const dashboardSearchSchema = z
  .object({
    range: z
      .enum([
        "this_month",
        "custom",
        "last_7_days",
        "last_30_days",
        "last_3_months",
      ])
      .optional()
      .default("last_3_months"),
    from: businessDateSchema.optional(),
    to: businessDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.range === "custom") {
      if (!value.from) {
        ctx.addIssue({
          code: "custom",
          path: ["from"],
          message: "From date is required for a custom range",
        });
      }
      if (!value.to) {
        ctx.addIssue({
          code: "custom",
          path: ["to"],
          message: "To date is required for a custom range",
        });
      }
    }
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "To date must be on or after from date",
      });
    }
  });
