import { assertBalancedJournalLines } from "@/modules/accounting/domain/balance";
import { AccountNotFoundError } from "@/modules/accounting/domain/errors";
import {
  assertPeriodOpen,
  financialYearKeyFromDate,
  periodKeyFromDate,
} from "@/modules/accounting/domain/period";
import type { JournalLineDraft, PostedJournal } from "@/modules/accounting/domain/types";
import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import type { BusinessDate } from "@/modules/shared-kernel/dates";

export type PostJournalInput = {
  tenantId: string;
  accountingDate: BusinessDate;
  financialYearStartMonth: number;
  closedThroughPeriodKey: string | null;
  sourceType: string;
  sourceId: string;
  memo?: string | null;
  reversalOfJournalId?: string | null;
  lines: JournalLineDraft[];
  accountRepository: AccountRepository;
  journalRepository: JournalRepository;
};

export async function postJournal(input: PostJournalInput): Promise<PostedJournal> {
  assertPeriodOpen(input.accountingDate, input.closedThroughPeriodKey);
  assertBalancedJournalLines(input.lines);

  const resolved = [];
  for (const line of input.lines) {
    const account = await input.accountRepository.findByCode(
      input.tenantId,
      line.accountCode
    );
    if (!account) {
      throw new AccountNotFoundError(line.accountCode);
    }
    resolved.push({ ...line, accountId: account.id });
  }

  return input.journalRepository.insertPosted({
    tenantId: input.tenantId,
    accountingDate: input.accountingDate,
    periodKey: periodKeyFromDate(input.accountingDate),
    financialYearKey: financialYearKeyFromDate(
      input.accountingDate,
      input.financialYearStartMonth
    ),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    memo: input.memo ?? null,
    reversalOfJournalId: input.reversalOfJournalId ?? null,
    lines: resolved,
  });
}
