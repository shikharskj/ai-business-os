import { financialYearForDate, type BusinessDate } from "@/modules/shared-kernel/dates";

export const PURCHASE_SERIES_PREFIX = "BILL";

export function purchaseFinancialYearKey(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  const fy = financialYearForDate(date, financialYearStartMonth);
  const startYear = fy.start.slice(0, 4);
  const endYear = fy.end.slice(0, 4);
  return `FY${startYear}-${endYear.slice(2)}`;
}

export function formatPurchaseNumber(
  financialYearKey: string,
  sequence: number
): string {
  return `${PURCHASE_SERIES_PREFIX}/${financialYearKey}/${String(sequence).padStart(4, "0")}`;
}

export const PURCHASE_RETURN_SERIES_PREFIX = "PR";

export function purchaseReturnFinancialYearKey(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  return purchaseFinancialYearKey(date, financialYearStartMonth);
}

export function formatPurchaseReturnNumber(
  financialYearKey: string,
  sequence: number
): string {
  return `${PURCHASE_RETURN_SERIES_PREFIX}/${financialYearKey}/${String(sequence).padStart(4, "0")}`;
}
