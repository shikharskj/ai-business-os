import type { PostedJournal } from "@/modules/accounting/domain/types";
import type { JournalLineDraft } from "@/modules/accounting/domain/types";

export function reversalLines(journal: PostedJournal): JournalLineDraft[] {
  return journal.lines.map((line) => ({
    accountCode: line.accountCode,
    description: line.description,
    debit: line.credit,
    credit: line.debit,
  }));
}
