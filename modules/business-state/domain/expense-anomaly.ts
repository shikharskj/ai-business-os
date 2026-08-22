import {
  EXPENSE_ANOMALY_LOOKBACK_DAYS,
  EXPENSE_ANOMALY_MIN_SAMPLES,
  EXPENSE_ANOMALY_MULTIPLIER,
  EXPENSE_ANOMALY_SURFACE_DAYS,
} from "@/modules/business-state/domain/types";
import type { Expense } from "@/modules/expenses/domain/types";
import {
  addBusinessDays,
  type BusinessDate,
} from "@/modules/shared-kernel/dates";
import { money, type Money } from "@/modules/shared-kernel/money";

export type UnusualExpenseMatch = {
  expense: Expense;
  categoryAverage: Money;
  sampleCount: number;
  multiplier: number;
};

function inInclusiveRange(
  date: BusinessDate,
  from: BusinessDate,
  to: BusinessDate
): boolean {
  return date >= from && date <= to;
}

function averageGrandTotal(
  expenses: readonly Expense[],
  currency: string
): Money | null {
  const matching = expenses.filter((e) => e.grandTotal.currency === currency);
  if (matching.length === 0) {
    return null;
  }
  let totalMinor = 0n;
  for (const expense of matching) {
    totalMinor += expense.grandTotal.amountMinor;
  }
  return money(totalMinor / BigInt(matching.length), currency);
}

/**
 * Simple unusual-expense rule: same-category amount vs recent average.
 * Does not recategorize. Requires a minimum peer sample so a first bill
 * in a category is never treated as an anomaly.
 */
export function findUnusualExpenses(input: {
  expenses: readonly Expense[];
  tenantId: string;
  today: BusinessDate;
  lookbackDays?: number;
  surfaceDays?: number;
  minSamples?: number;
  multiplier?: number;
}): UnusualExpenseMatch[] {
  const lookbackDays = input.lookbackDays ?? EXPENSE_ANOMALY_LOOKBACK_DAYS;
  const surfaceDays = input.surfaceDays ?? EXPENSE_ANOMALY_SURFACE_DAYS;
  const minSamples = input.minSamples ?? EXPENSE_ANOMALY_MIN_SAMPLES;
  const multiplier = input.multiplier ?? EXPENSE_ANOMALY_MULTIPLIER;
  const lookbackFrom = addBusinessDays(input.today, -lookbackDays);
  const surfaceFrom = addBusinessDays(input.today, -surfaceDays);

  const scoped = input.expenses.filter(
    (expense) =>
      expense.tenantId === input.tenantId &&
      inInclusiveRange(expense.incurredOn, lookbackFrom, input.today)
  );

  const matches: UnusualExpenseMatch[] = [];
  for (const expense of scoped) {
    if (expense.incurredOn < surfaceFrom) continue;
    if (expense.grandTotal.amountMinor <= 0n) continue;

    const peers = scoped.filter(
      (candidate) =>
        candidate.id !== expense.id && candidate.category === expense.category
    );
    if (peers.length < minSamples) continue;

    const categoryAverage = averageGrandTotal(
      peers,
      expense.grandTotal.currency
    );
    if (!categoryAverage || categoryAverage.amountMinor <= 0n) continue;

    if (
      expense.grandTotal.amountMinor >=
      categoryAverage.amountMinor * BigInt(multiplier)
    ) {
      matches.push({
        expense,
        categoryAverage,
        sampleCount: peers.length,
        multiplier,
      });
    }
  }

  return matches;
}
