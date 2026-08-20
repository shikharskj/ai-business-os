import { z } from "zod";

const periodKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Select a valid period (YYYY-MM)");

export const gstSummarySearchSchema = z.object({
  period: periodKeySchema,
});
