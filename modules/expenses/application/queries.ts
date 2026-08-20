import { ExpenseNotFoundError } from "@/modules/expenses/domain/errors";
import type { Expense, ExpenseListFilter } from "@/modules/expenses/domain/types";
import type { ListPageParams, ListPageResult } from "@/modules/shared-kernel/list-page";
import type { ExpenseRepository } from "@/modules/expenses/infrastructure/repositories";

export async function getExpense(input: {
  tenantId: string;
  expenseId: string;
  expenses: ExpenseRepository;
}): Promise<Expense> {
  const expense = await input.expenses.findExpenseById(input.tenantId, input.expenseId);
  if (!expense) {
    throw new ExpenseNotFoundError();
  }
  return expense;
}

export async function listExpenses(input: {
  tenantId: string;
  query?: string;
  category?: ExpenseListFilter["category"];
  fromDate?: ExpenseListFilter["fromDate"];
  toDate?: ExpenseListFilter["toDate"];
  expenses: ExpenseRepository;
}): Promise<Expense[]> {
  return input.expenses.listExpenses({
    tenantId: input.tenantId,
    query: input.query,
    category: input.category,
    fromDate: input.fromDate,
    toDate: input.toDate,
  });
}

export async function listExpensesPage(input: {
  tenantId: string;
  query?: string;
  category?: ExpenseListFilter["category"];
  fromDate?: ExpenseListFilter["fromDate"];
  toDate?: ExpenseListFilter["toDate"];
  page: number;
  pageSize: ListPageParams["pageSize"];
  expenses: ExpenseRepository;
}): Promise<ListPageResult<Expense>> {
  return input.expenses.listExpensesPage({
    tenantId: input.tenantId,
    query: input.query,
    category: input.category,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });
}
