import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";

export type Account = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
};

export const ACCOUNT_CODES = {
  CASH: "1000",
  BANK: "1010",
  RECEIVABLE: "1100",
  INVENTORY: "1200",
  INPUT_GST: "1300",
  PAYABLE: "2000",
  OUTPUT_GST: "2100",
  CAPITAL: "3000",
  SALES: "4000",
  COGS: "5000",
  OPERATING_EXPENSE: "5100",
} as const;

export type SystemAccountCode = (typeof ACCOUNT_CODES)[keyof typeof ACCOUNT_CODES];

export type JournalLineDraft = {
  accountCode: string;
  description?: string;
  debit: Money;
  credit: Money;
};

export type PostedJournalLine = JournalLineDraft & {
  id: string;
  accountId: string;
};

export type PostedJournal = {
  id: string;
  tenantId: string;
  accountingDate: BusinessDate;
  periodKey: string;
  financialYearKey: string;
  sourceType: string;
  sourceId: string;
  memo: string | null;
  reversalOfJournalId: string | null;
  postedAt: Date;
  lines: PostedJournalLine[];
};
