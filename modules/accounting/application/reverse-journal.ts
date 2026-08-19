import { DuplicateReversalError, JournalNotFoundError } from "@/modules/accounting/domain/errors";
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

  try {
    return await postJournal({
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
  } catch (error) {
    if (error instanceof DuplicateReversalError || isUniqueConstraintError(error)) {
      throw new DuplicateReversalError();
    }
    throw error;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
