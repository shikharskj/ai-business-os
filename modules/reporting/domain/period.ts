import { businessDate, type BusinessDate } from "@/modules/shared-kernel/dates";

import { InvalidGstReportPeriodError } from "@/modules/reporting/domain/errors";

const PERIOD_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isPeriodKey(value: string): boolean {
  return PERIOD_KEY.test(value);
}

/** Inclusive calendar date range for a YYYY-MM period key. */
export function periodDateRange(periodKey: string): {
  fromDate: BusinessDate;
  toDate: BusinessDate;
} {
  if (!isPeriodKey(periodKey)) {
    throw new InvalidGstReportPeriodError(periodKey);
  }
  const [year, month] = periodKey.split("-").map(Number) as [number, number];
  const fromDate = businessDate(`${periodKey}-01`);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const toDate = businessDate(
    `${periodKey}-${String(lastDay).padStart(2, "0")}`
  );
  return { fromDate, toDate };
}
