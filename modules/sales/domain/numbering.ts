import { financialYearForDate, type BusinessDate } from "@/modules/shared-kernel/dates";

export const QUOTATION_SERIES_PREFIX = "QT";

export function quotationFinancialYearKey(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  const fy = financialYearForDate(date, financialYearStartMonth);
  const startYear = fy.start.slice(0, 4);
  const endYear = fy.end.slice(0, 4);
  return `FY${startYear}-${endYear.slice(2)}`;
}

export function formatQuotationNumber(
  financialYearKey: string,
  sequence: number
): string {
  return `${QUOTATION_SERIES_PREFIX}/${financialYearKey}/${String(sequence).padStart(4, "0")}`;
}

export const INVOICE_SERIES_PREFIX = "INV";

export function invoiceFinancialYearKey(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  return quotationFinancialYearKey(date, financialYearStartMonth);
}

export function formatInvoiceNumber(
  financialYearKey: string,
  sequence: number
): string {
  return `${INVOICE_SERIES_PREFIX}/${financialYearKey}/${String(sequence).padStart(4, "0")}`;
}

export const SALES_ORDER_SERIES_PREFIX = "SO";

export function salesOrderFinancialYearKey(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  return quotationFinancialYearKey(date, financialYearStartMonth);
}

export function formatSalesOrderNumber(
  financialYearKey: string,
  sequence: number
): string {
  return `${SALES_ORDER_SERIES_PREFIX}/${financialYearKey}/${String(sequence).padStart(4, "0")}`;
}

export const CREDIT_NOTE_SERIES_PREFIX = "CN";

export function creditNoteFinancialYearKey(
  date: BusinessDate,
  financialYearStartMonth: number
): string {
  return quotationFinancialYearKey(date, financialYearStartMonth);
}

export function formatCreditNoteNumber(
  financialYearKey: string,
  sequence: number
): string {
  return `${CREDIT_NOTE_SERIES_PREFIX}/${financialYearKey}/${String(sequence).padStart(4, "0")}`;
}
