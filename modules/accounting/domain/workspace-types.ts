import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";
import type {
  AccountType,
  NormalBalance,
  PostedJournal,
} from "@/modules/accounting/domain/types";

export type JournalListFilter = {
  tenantId: string;
  query?: string;
  periodKey?: string;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type LedgerQuery = {
  tenantId: string;
  accountId: string;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
  periodKey?: string;
};

export type LedgerLine = {
  journalId: string;
  journalLineId: string;
  accountingDate: BusinessDate;
  periodKey: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  memo: string | null;
  description: string | null;
  sourceType: string;
  debit: Money;
  credit: Money;
  balance: Money;
};

export type TrialBalanceRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  debitTotal: Money;
  creditTotal: Money;
};

export type TrialBalance = {
  periodKey: string;
  rows: TrialBalanceRow[];
  totalDebits: Money;
  totalCredits: Money;
  isBalanced: boolean;
};

export type PeriodStatus = {
  currentPeriodKey: string;
  closedThroughPeriodKey: string | null;
  currentPeriodClosed: boolean;
};

export type JournalSummary = Pick<
  PostedJournal,
  | "id"
  | "tenantId"
  | "accountingDate"
  | "periodKey"
  | "financialYearKey"
  | "sourceType"
  | "sourceId"
  | "memo"
  | "reversalOfJournalId"
  | "postedAt"
> & {
  totalDebits: Money;
  totalCredits: Money;
  lineCount: number;
};
