import { ACCOUNT_CODES, type JournalLineDraft } from "@/modules/accounting/domain/types";
import { money, type Money } from "@/modules/shared-kernel/money";
import { cashAccountCodeForMethod } from "@/modules/payments/domain/methods";
import type { PaymentMethod } from "@/modules/payments/domain/types";

export function buildExpenseJournalLines(input: {
  expenseNumber: string;
  method: PaymentMethod;
  taxableAmount: Money;
  totalTax: Money;
  grandTotal: Money;
}): JournalLineDraft[] {
  const zero = money(0n, input.taxableAmount.currency, input.taxableAmount.scale);
  const description = `Expense ${input.expenseNumber}`;
  const lines: JournalLineDraft[] = [
    {
      accountCode: ACCOUNT_CODES.OPERATING_EXPENSE,
      description,
      debit: input.taxableAmount,
      credit: zero,
    },
  ];

  if (input.totalTax.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.INPUT_GST,
      description,
      debit: input.totalTax,
      credit: zero,
    });
  }

  lines.push({
    accountCode: cashAccountCodeForMethod(input.method),
    description,
    debit: zero,
    credit: input.grandTotal,
  });

  return lines;
}
