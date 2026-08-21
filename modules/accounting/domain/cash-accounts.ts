import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";

/**
 * Designated cash-position accounts on the per-tenant chart.
 *
 * Cash position is the sum of these ledger balances — never unpaid invoices,
 * receipts-in-period, or other document tables (architecture cash model).
 */
export const CASH_POSITION_ACCOUNT_CODES = [
  ACCOUNT_CODES.CASH,
  ACCOUNT_CODES.BANK,
] as const;

export type CashPositionAccountCode =
  (typeof CASH_POSITION_ACCOUNT_CODES)[number];

const CASH_POSITION_ACCOUNT_CODE_SET: ReadonlySet<string> = new Set(
  CASH_POSITION_ACCOUNT_CODES
);

export function isCashPositionAccountCode(
  code: string
): code is CashPositionAccountCode {
  return CASH_POSITION_ACCOUNT_CODE_SET.has(code);
}

export const CASH_POSITION_FACT_IDS = {
  total: "cash-position:total",
  cash: "cash-position:cash",
  bank: "cash-position:bank",
} as const;

export function cashPositionAccountFactId(accountCode: string): string {
  return `cash-position:account:${accountCode}`;
}
