import { daysBetween, toMoneyView } from "@/modules/ai/domain/tool-output";
import type { AiToolContext } from "@/modules/ai/domain/tool-types";
import type { PeriodMovementOutput } from "@/modules/ai/schemas/ai-tool.schema";
import {
  getDashboardOverview,
  getExpenseReport,
  getReceivablesReport,
  getSalesReport,
  previousDashboardDateRange,
  type DashboardDateRange,
} from "@/modules/reporting";
import { addMoney, subtractMoney, type Money } from "@/modules/shared-kernel/money";

const MAX_DRIVER_ROWS = 3;
const MAX_OVERDUE_IDS = 10;

type MovementDirection = "up" | "down" | "flat";

function directionOf(delta: Money): MovementDirection {
  if (delta.amountMinor > 0n) return "up";
  if (delta.amountMinor < 0n) return "down";
  return "flat";
}

function movementLine(current: Money, previous: Money) {
  const delta = subtractMoney(current, previous);
  return {
    current: toMoneyView(current),
    previous: toMoneyView(previous),
    delta: toMoneyView(delta),
    direction: directionOf(delta),
  };
}

function classifyDriver(input: {
  revenueDelta: Money;
  expenseDelta: Money;
  profitDelta: Money;
}): PeriodMovementOutput["driver"] {
  const salesFell = input.revenueDelta.amountMinor < 0n;
  const salesRose = input.revenueDelta.amountMinor > 0n;
  const expensesRose = input.expenseDelta.amountMinor > 0n;
  const expensesFell = input.expenseDelta.amountMinor < 0n;
  const profitFlat = input.profitDelta.amountMinor === 0n;
  const unchanged =
    input.revenueDelta.amountMinor === 0n &&
    input.expenseDelta.amountMinor === 0n &&
    profitFlat;

  if (unchanged) {
    return {
      kind: "stable",
      summary:
        "Sales, expenses, and profit are unchanged versus the previous period.",
    };
  }

  if (salesFell && expensesRose) {
    return {
      kind: "both",
      summary:
        "Profit moved because sales fell and expenses rose versus the previous period.",
    };
  }
  if (input.profitDelta.amountMinor < 0n && expensesRose && !salesFell) {
    return {
      kind: "expenses",
      summary:
        "Profit fell because expenses rose versus the previous period.",
    };
  }
  if (input.profitDelta.amountMinor < 0n && salesFell) {
    return {
      kind: "sales",
      summary: "Profit fell because sales were lower versus the previous period.",
    };
  }
  if (input.profitDelta.amountMinor > 0n && salesRose && expensesFell) {
    return {
      kind: "both",
      summary:
        "Profit rose because sales were higher and expenses were lower versus the previous period.",
    };
  }
  if (input.profitDelta.amountMinor > 0n && salesRose && !expensesRose) {
    return {
      kind: "sales",
      summary: "Profit rose because sales were higher versus the previous period.",
    };
  }
  if (input.profitDelta.amountMinor > 0n && expensesFell) {
    return {
      kind: "expenses",
      summary:
        "Profit rose because expenses were lower versus the previous period.",
    };
  }
  if (salesRose && expensesRose) {
    return {
      kind: "both",
      summary:
        "Sales and expenses both moved versus the previous period; use the returned deltas rather than estimating the mix.",
    };
  }
  return {
    kind: "both",
    summary:
      "Sales and expenses both moved versus the previous period; use the returned deltas rather than estimating the mix.",
  };
}

/**
 * Deterministic period comparison for diagnostic “why” questions.
 * Money math stays in application code; the model only explains the result.
 */
export async function composePeriodMovement(input: {
  context: AiToolContext;
  range: DashboardDateRange;
}): Promise<PeriodMovementOutput> {
  const previousRange = previousDashboardDateRange(input.range);
  const { context } = input;
  const overviewDeps = {
    tenantId: context.tenantId,
    timezone: context.timezone,
    lowStockThresholdMajor: context.lowStockThresholdMajor,
    sales: context.repositories.sales,
    purchases: context.repositories.purchases,
    expenses: context.repositories.expenses,
    payments: context.repositories.payments,
    supplierPayments: context.repositories.supplierPayments,
    catalog: context.repositories.catalog,
    inventory: context.repositories.inventory,
  };

  const [current, previous, sales, expenses, receivables] = await Promise.all([
    getDashboardOverview({ ...overviewDeps, range: input.range }),
    getDashboardOverview({ ...overviewDeps, range: previousRange }),
    getSalesReport({
      tenantId: context.tenantId,
      range: input.range,
      sales: context.repositories.sales,
    }),
    getExpenseReport({
      tenantId: context.tenantId,
      range: input.range,
      expenses: context.repositories.expenses,
    }),
    getReceivablesReport({
      tenantId: context.tenantId,
      timezone: context.timezone,
      currency: context.currency,
      sales: context.repositories.sales,
      payments: context.repositories.payments,
    }),
  ]);

  const revenueDelta = subtractMoney(current.revenue, previous.revenue);
  const expenseDelta = subtractMoney(current.expenses, previous.expenses);
  const profitDelta = subtractMoney(current.profit, previous.profit);

  const largestInvoices = [...sales.rows]
    .sort((a, b) =>
      a.grandTotal.amountMinor === b.grandTotal.amountMinor
        ? 0
        : a.grandTotal.amountMinor > b.grandTotal.amountMinor
          ? -1
          : 1
    )
    .slice(0, MAX_DRIVER_ROWS)
    .map((row) => ({
      invoiceId: row.id,
      invoiceNumber: row.number,
      customerName: row.customerName,
      issuedOn: row.issuedOn,
      grandTotal: toMoneyView(row.grandTotal),
    }));

  const categoryTotals = new Map<
    string,
    { category: string; categoryLabel: string; expenseCount: number; total: Money }
  >();
  for (const row of expenses.rows) {
    const existing = categoryTotals.get(row.category);
    if (existing) {
      existing.expenseCount += 1;
      existing.total = addMoney(existing.total, row.grandTotal);
      continue;
    }
    categoryTotals.set(row.category, {
      category: row.category,
      categoryLabel: row.categoryLabel,
      expenseCount: 1,
      total: row.grandTotal,
    });
  }

  const topExpenseCategories = [...categoryTotals.values()]
    .sort((a, b) =>
      a.total.amountMinor === b.total.amountMinor
        ? 0
        : a.total.amountMinor > b.total.amountMinor
          ? -1
          : 1
    )
    .slice(0, MAX_DRIVER_ROWS)
    .map((row) => ({
      category: row.category,
      categoryLabel: row.categoryLabel,
      expenseCount: row.expenseCount,
      total: toMoneyView(row.total),
    }));

  const overdue = receivables.rows
    .flatMap((row) => {
      const dueOn = row.dueOn;
      if (!dueOn || dueOn >= receivables.asOf) return [];
      if (row.outstanding.amountMinor <= 0n) return [];
      return [
        {
          invoiceId: row.invoiceId,
          daysOverdue: daysBetween(dueOn, receivables.asOf),
        },
      ];
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    currentRange: {
      fromDate: input.range.fromDate,
      toDate: input.range.toDate,
      label: input.range.label,
    },
    previousRange: {
      fromDate: previousRange.fromDate,
      toDate: previousRange.toDate,
      label: previousRange.label,
    },
    revenue: movementLine(current.revenue, previous.revenue),
    expenses: movementLine(current.expenses, previous.expenses),
    profit: movementLine(current.profit, previous.profit),
    driver: classifyDriver({
      revenueDelta,
      expenseDelta,
      profitDelta,
    }),
    largestInvoices,
    topExpenseCategories,
    overdueInvoiceCount: current.overdueInvoiceCount,
    overdueOutstanding: toMoneyView(current.overdueOutstanding),
    overdueInvoiceIds: overdue.slice(0, MAX_OVERDUE_IDS).map((row) => row.invoiceId),
    lowStockCount: current.lowStockCount,
  };
}
