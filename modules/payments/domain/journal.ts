import { ACCOUNT_CODES, type JournalLineDraft } from "@/modules/accounting/domain/types";
import { money, type Money } from "@/modules/shared-kernel/money";
import { cashAccountCodeForMethod } from "@/modules/payments/domain/methods";
import type { PaymentMethod } from "@/modules/payments/domain/types";

export function buildCustomerReceiptJournalLines(input: {
  paymentNumber: string;
  method: PaymentMethod;
  amount: Money;
}): JournalLineDraft[] {
  const zero = money(0n, input.amount.currency, input.amount.scale);
  const description = `Receipt ${input.paymentNumber}`;
  return [
    {
      accountCode: cashAccountCodeForMethod(input.method),
      description,
      debit: input.amount,
      credit: zero,
    },
    {
      accountCode: ACCOUNT_CODES.RECEIVABLE,
      description,
      debit: zero,
      credit: input.amount,
    },
  ];
}
