import { JournalNotFoundError } from "@/modules/accounting/domain/errors";
import { reversalLines } from "@/modules/accounting/domain/reversal";
import { postJournal } from "@/modules/accounting/application/post-journal";
import type { PostedJournal } from "@/modules/accounting/domain/types";
import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import type { BusinessDate } from "@/modules/shared-kernel/dates";

export async function reverseJournal(input: {
  tenantId: string;
  journalId: string;
  accountingDate: BusinessDate;
  financialYearStartMonth: number;
  closedThroughPeriodKey: string | null;
  accountRepository: AccountRepository;
  journalRepository: JournalRepository;
}): Promise<PostedJournal> {
  const original = await input.journalRepository.findById(
    input.tenantId,
    input.journalId
  );
  if (!original) {
    throw new JournalNotFoundError(input.journalId);
  }

  return postJournal({
    tenantId: input.tenantId,
    accountingDate: input.accountingDate,
    financialYearStartMonth: input.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    sourceType: "Reversal",
    sourceId: original.id,
    memo: `Reversal of ${original.id}`,
    reversalOfJournalId: original.id,
    lines: reversalLines(original),
    accountRepository: input.accountRepository,
    journalRepository: input.journalRepository,
  });
}
