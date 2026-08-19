import { addMoney, isNegative, isZero, money, type Money } from "@/modules/shared-kernel/money";

import {
  InvalidJournalLineError,
  UnbalancedJournalError,
} from "@/modules/accounting/domain/errors";
import type { JournalLineDraft } from "@/modules/accounting/domain/types";

export function assertBalancedJournalLines(lines: JournalLineDraft[]): {
  totalDebit: Money;
  totalCredit: Money;
} {
  if (lines.length < 2) {
    throw new InvalidJournalLineError("A journal must have at least two lines.");
  }

  let totalDebit = money(0n, lines[0]!.debit.currency, lines[0]!.debit.scale);
  let totalCredit = money(0n, lines[0]!.credit.currency, lines[0]!.credit.scale);

  for (const line of lines) {
    if (isNegative(line.debit) || isNegative(line.credit)) {
      throw new InvalidJournalLineError("Journal line amounts cannot be negative.");
    }
    if (isZero(line.debit) === isZero(line.credit)) {
      throw new InvalidJournalLineError(
        "Each journal line must have exactly one of debit or credit greater than zero."
      );
    }
    totalDebit = addMoney(totalDebit, line.debit);
    totalCredit = addMoney(totalCredit, line.credit);
  }

  if (totalDebit.amountMinor !== totalCredit.amountMinor) {
    throw new UnbalancedJournalError();
  }

  return { totalDebit, totalCredit };
}
