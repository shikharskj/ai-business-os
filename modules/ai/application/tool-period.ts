import type { z } from "zod";

import { AiToolInputError } from "@/modules/ai/domain/errors";
import type { periodInputSchema } from "@/modules/ai/schemas/ai-tool.schema";
import {
  ReportingError,
  resolveDashboardDateRange,
  type DashboardDateRange,
} from "@/modules/reporting";

export type AiToolPeriodInput = z.output<typeof periodInputSchema>;

/**
 * Reuses the same range resolution the dashboard and reports use, so an AI
 * answer for "this month" covers exactly the period the UI would show.
 */
export function resolveAiToolPeriod(input: {
  period: AiToolPeriodInput;
  timezone: string;
}): DashboardDateRange {
  try {
    return resolveDashboardDateRange({
      timezone: input.timezone,
      preset: input.period.preset,
      from: input.period.fromDate,
      to: input.period.toDate,
    });
  } catch (error) {
    if (error instanceof ReportingError) {
      throw new AiToolInputError(error.message);
    }
    throw error;
  }
}
