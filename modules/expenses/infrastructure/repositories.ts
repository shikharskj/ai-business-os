import { businessDate } from "@/modules/shared-kernel/dates";
import type { Expense, ExpenseListFilter } from "@/modules/expenses/domain/types";

export type CreateExpenseRecordInput = Omit<Expense, "createdAt" | "updatedAt">;

export type ExpenseRepository = {
  allocateNextExpenseNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createExpense(input: CreateExpenseRecordInput): Promise<Expense>;
  findExpenseById(tenantId: string, expenseId: string): Promise<Expense | null>;
  listExpenses(filter: ExpenseListFilter): Promise<Expense[]>;
};

function cloneExpense(expense: Expense): Expense {
  return { ...expense };
}

export function createMemoryExpenseRepository(
  initial: Expense[] = []
): ExpenseRepository & {
  expenses: Expense[];
  series: Map<string, number>;
} {
  const expenses = initial.map(cloneExpense);
  const series = new Map<string, number>();

  return {
    expenses,
    series,
    async allocateNextExpenseNumber(tenantId, financialYearKey) {
      const key = `${tenantId}:${financialYearKey}`;
      const next = (series.get(key) ?? 0) + 1;
      series.set(key, next);
      return next;
    },
    async createExpense(input) {
      const now = new Date();
      const expense: Expense = {
        ...input,
        incurredOn: businessDate(input.incurredOn),
        createdAt: now,
        updatedAt: now,
      };
      expenses.push(expense);
      return cloneExpense(expense);
    },
    async findExpenseById(tenantId, expenseId) {
      const record = expenses.find(
        (item) => item.tenantId === tenantId && item.id === expenseId
      );
      return record ? cloneExpense(record) : null;
    },
    async listExpenses(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      return expenses
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.category && record.category !== filter.category) {
            return false;
          }
          if (filter.fromDate && record.incurredOn < filter.fromDate) {
            return false;
          }
          if (filter.toDate && record.incurredOn > filter.toDate) {
            return false;
          }
          if (!query) {
            return true;
          }
          return [record.number, record.notes ?? "", record.vendorGstin ?? ""].some(
            (value) => value.toLowerCase().includes(query)
          );
        })
        .sort(
          (a, b) =>
            b.incurredOn.localeCompare(a.incurredOn) || b.number.localeCompare(a.number)
        )
        .map(cloneExpense);
    },
  };
}
