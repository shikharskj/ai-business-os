import { authorize } from "@/lib/security";
import {
  ReportingError,
  resolveDashboardDateRange,
  type DashboardDateRange,
} from "@/modules/reporting";

export async function resolveReportRange(input: {
  timezone: string;
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
}): Promise<{ range: DashboardDateRange; error: string | null }> {
  const preset = Array.isArray(input.range) ? input.range[0] : input.range;
  const from = Array.isArray(input.from) ? input.from[0] : input.from;
  const to = Array.isArray(input.to) ? input.to[0] : input.to;

  try {
    return {
      range: resolveDashboardDateRange({
        timezone: input.timezone,
        preset: preset ?? (from || to ? "custom" : "this_month"),
        from,
        to,
      }),
      error: null,
    };
  } catch (error) {
    return {
      range: resolveDashboardDateRange({
        timezone: input.timezone,
        preset: "this_month",
      }),
      error:
        error instanceof ReportingError
          ? error.message
          : "Invalid date filter. Showing this month.",
    };
  }
}

export async function requireReportTenant() {
  return authorize("report:read");
}
