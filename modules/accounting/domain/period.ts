import {
  businessDate,
  financialYearForDate,
  type BusinessDate,
} from "@/modules/shared-kernel/dates";

import { ClosedPeriodError } from "@/modules/accounting/domain/errors";

/** Calendar month of the accounting date, YYYY-MM. Comparable lexicographically. */
export function periodKeyFromDate(date: BusinessDate): string {
  return date.slice(0, 7);
}

export function financialYearKeyFromDate(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  const fy = financialYearForDate(date, financialYearStartMonth);
  const startYear = fy.start.slice(0, 4);
  const endYear = fy.end.slice(0, 4);
  return `FY${startYear}-${endYear.slice(2)}`;
}

export function assertPeriodOpen(
  accountingDate: BusinessDate,
  closedThroughPeriodKey: string | null
): void {
  businessDate(accountingDate);
  if (!closedThroughPeriodKey) {
    return;
  }
  if (!/^\d{4}-\d{2}$/.test(closedThroughPeriodKey)) {
    throw new ClosedPeriodError(closedThroughPeriodKey);
  }
  const periodKey = periodKeyFromDate(accountingDate);
  if (periodKey <= closedThroughPeriodKey) {
    throw new ClosedPeriodError(periodKey);
  }
}
