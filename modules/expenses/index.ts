export type {
  Expense,
  ExpenseCategory,
  ExpenseListFilter,
  ExpenseTaxContext,
  RecordExpenseInput,
} from "@/modules/expenses/domain/types";
export {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/modules/expenses/domain/types";
export {
  ExpenseError,
  ExpenseNotFoundError,
  ExpenseValidationError,
} from "@/modules/expenses/domain/errors";
export { buildExpenseJournalLines } from "@/modules/expenses/domain/journal";
export {
  formatExpenseNumber,
  expenseFinancialYearKey,
  EXPENSE_SERIES_PREFIX,
} from "@/modules/expenses/domain/numbering";
export { recordExpense } from "@/modules/expenses/application/record-expense";
export { getExpense, listExpenses } from "@/modules/expenses/application/queries";
export {
  attachExpenseDocument,
  listExpenseDocuments,
  deleteExpenseDocument,
} from "@/modules/expenses/application/attachments";
export { expenseTaxContextFromTenant } from "@/modules/expenses/application/tax-context";
export {
  createMemoryExpenseRepository,
  type ExpenseRepository,
} from "@/modules/expenses/infrastructure/repositories";
export {
  recordExpenseSchema,
  expenseSearchSchema,
  toExpenseFields,
} from "@/modules/expenses/schemas/expense.schema";
