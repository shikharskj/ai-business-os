import { z } from "zod";

import { isCalendarDate } from "@/modules/shared-kernel/dates";

export const moneyInputSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/,/g, ""))
  .pipe(
    z
      .string()
      .regex(/^-?\d{1,15}(\.\d{1,2})?$/, "Enter a valid amount (up to 2 decimal places)")
  );

export const businessDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)")
  .refine(isCalendarDate, { message: "Enter a valid calendar date" });

export const positiveMoneyInputSchema = moneyInputSchema.refine(
  (v) => {
    const n = Number(v);
    return !isNaN(n) && n > 0;
  },
  { message: "Amount must be greater than zero" }
);
