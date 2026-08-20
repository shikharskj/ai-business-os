import { financialYearForDate, type BusinessDate } from "@/modules/shared-kernel/dates";

export const PAYMENT_SERIES_PREFIX = "RCP";

export function paymentFinancialYearKey(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  const fy = financialYearForDate(date, financialYearStartMonth);
  const startYear = fy.start.slice(0, 4);
  const endYear = fy.end.slice(0, 4);
  return `FY${startYear}-${endYear.slice(2)}`;
}

export function formatPaymentNumber(
  financialYearKey: string,
  sequence: number
): string {
  return `${PAYMENT_SERIES_PREFIX}/${financialYearKey}/${String(sequence).padStart(4, "0")}`;
}
