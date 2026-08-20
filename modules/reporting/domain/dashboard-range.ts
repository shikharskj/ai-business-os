import {
  businessDate,
  todayInTimezone,
  type BusinessDate,
} from "@/modules/shared-kernel/dates";
import { periodDateRange } from "@/modules/reporting/domain/period";
import { periodKeyFromDate } from "@/modules/accounting/domain/period";
import { ReportingError } from "@/modules/reporting/domain/errors";

const MAX_CUSTOM_RANGE_DAYS = 365;

export type DashboardDatePreset =
  | "this_month"
  | "custom"
  | "last_7_days"
  | "last_30_days"
  | "last_3_months";

export type DashboardDateRange = {
  preset: DashboardDatePreset;
  fromDate: BusinessDate;
  toDate: BusinessDate;
  label: string;
};

export const DASHBOARD_CHART_RANGE_PRESETS = [
  {
    id: "last_7_days" as const,
    label: "Last 7 days",
  },
  {
    id: "last_30_days" as const,
    label: "Last 30 days",
  },
  {
    id: "last_3_months" as const,
    label: "Last 3 months",
  },
];

function shiftBusinessDate(date: BusinessDate, dayDelta: number): BusinessDate {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + dayDelta);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return businessDate(`${y}-${m}-${d}`);
}

function inclusiveDayWindow(
  today: BusinessDate,
  dayCount: number
): { fromDate: BusinessDate; toDate: BusinessDate } {
  return {
    fromDate: shiftBusinessDate(today, -(dayCount - 1)),
    toDate: today,
  };
}

function monthsBackFromToday(today: BusinessDate, months: number): BusinessDate {
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const targetYear = year;
  const targetMonth = month - months;
  // Compute the last valid day in the target month
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  const utc = new Date(Date.UTC(targetYear, targetMonth - 1, clampedDay));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return businessDate(`${y}-${m}-${d}`);
}

export function resolveDashboardDateRange(input: {
  timezone: string;
  preset?: string | null;
  from?: string | null;
  to?: string | null;
}): DashboardDateRange {
  const today = todayInTimezone(input.timezone);
  const presetRaw = input.preset?.trim().toLowerCase() || "last_3_months";

  if (presetRaw === "custom") {
    if (!input.from || !input.to) {
      throw new ReportingError("Custom range requires both from and to dates.");
    }
    const fromDate = businessDate(input.from);
    const toDate = businessDate(input.to);
    if (fromDate > toDate) {
      throw new ReportingError("From date must be on or before to date.");
    }
    // Validate maximum span
    const fromMs = new Date(`${fromDate}T00:00:00.000Z`).getTime();
    const toMs = new Date(`${toDate}T00:00:00.000Z`).getTime();
    const daySpan = Math.ceil((toMs - fromMs) / (1000 * 60 * 60 * 24)) + 1;
    if (daySpan > MAX_CUSTOM_RANGE_DAYS) {
      throw new ReportingError(
        `Custom range span of ${daySpan} days exceeds maximum allowed ${MAX_CUSTOM_RANGE_DAYS} days.`
      );
    }
    return {
      preset: "custom",
      fromDate,
      toDate,
      label: `${fromDate} – ${toDate}`,
    };
  }

  if (presetRaw === "last_7_days") {
    const { fromDate, toDate } = inclusiveDayWindow(today, 7);
    return {
      preset: "last_7_days",
      fromDate,
      toDate,
      label: "Last 7 days",
    };
  }

  if (presetRaw === "last_30_days") {
    const { fromDate, toDate } = inclusiveDayWindow(today, 30);
    return {
      preset: "last_30_days",
      fromDate,
      toDate,
      label: "Last 30 days",
    };
  }

  if (presetRaw === "last_3_months") {
    const fromDate = monthsBackFromToday(today, 3);
    return {
      preset: "last_3_months",
      fromDate,
      toDate: today,
      label: "Last 3 months",
    };
  }

  if (presetRaw === "this_month") {
    const periodKey = periodKeyFromDate(today);
    const { fromDate, toDate } = periodDateRange(periodKey);
    return {
      preset: "this_month",
      fromDate,
      toDate: today < toDate ? today : toDate,
      label: "This month",
    };
  }

  throw new ReportingError(`Unknown dashboard range preset "${presetRaw}".`);
}
