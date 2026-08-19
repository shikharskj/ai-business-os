import type { AccountType, NormalBalance } from "@/modules/accounting/domain/types";
import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";

export type ChartAccountTemplate = {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
};

/**
 * Small per-tenant chart for an Indian SMB. Copied onto each business;
 * never a globally shared mutable row.
 */
export const MVP_CHART_OF_ACCOUNTS: readonly ChartAccountTemplate[] = [
  { code: ACCOUNT_CODES.CASH, name: "Cash", type: "ASSET", normalBalance: "DEBIT" },
  { code: ACCOUNT_CODES.BANK, name: "Bank", type: "ASSET", normalBalance: "DEBIT" },
  {
    code: ACCOUNT_CODES.RECEIVABLE,
    name: "Accounts Receivable",
    type: "ASSET",
    normalBalance: "DEBIT",
  },
  {
    code: ACCOUNT_CODES.INVENTORY,
    name: "Inventory",
    type: "ASSET",
    normalBalance: "DEBIT",
  },
  {
    code: ACCOUNT_CODES.INPUT_GST,
    name: "Input GST",
    type: "ASSET",
    normalBalance: "DEBIT",
  },
  {
    code: ACCOUNT_CODES.PAYABLE,
    name: "Accounts Payable",
    type: "LIABILITY",
    normalBalance: "CREDIT",
  },
  {
    code: ACCOUNT_CODES.OUTPUT_GST,
    name: "Output GST",
    type: "LIABILITY",
    normalBalance: "CREDIT",
  },
  {
    code: ACCOUNT_CODES.CAPITAL,
    name: "Owner's Capital",
    type: "EQUITY",
    normalBalance: "CREDIT",
  },
  { code: ACCOUNT_CODES.SALES, name: "Sales", type: "INCOME", normalBalance: "CREDIT" },
  {
    code: ACCOUNT_CODES.COGS,
    name: "Cost of Goods Sold",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  },
  {
    code: ACCOUNT_CODES.OPERATING_EXPENSE,
    name: "Operating Expenses",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  },
];
