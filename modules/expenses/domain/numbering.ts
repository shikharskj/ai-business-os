import { financialYearForDate, type BusinessDate } from "@/modules/shared-kernel/dates";

export const EXPENSE_SERIES_PREFIX = "EXP";

export function expenseFinancialYearKey(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  const fy = financialYearForDate(date, financialYearStartMonth);
  const startYear = fy.start.slice(0, 4);
  const endYear = fy.end.slice(0, 4);
  return `FY${startYear}-${endYear.slice(2)}`;
}

export function formatExpenseNumber(
  financialYearKey: string,
  sequence: number
): string {
  return `${EXPENSE_SERIES_PREFIX}/${financialYearKey}/${String(sequence).padStart(4, "0")}`;
}
