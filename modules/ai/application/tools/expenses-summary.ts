import { resolveAiToolPeriod } from "@/modules/ai/application/tool-period";
import { defineAiTool } from "@/modules/ai/domain/define-tool";
import { toMoneyView } from "@/modules/ai/domain/tool-output";
import {
  expensesSummaryInputSchema,
  expensesSummaryOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import { getExpenseReport } from "@/modules/reporting";
import { addMoney, type Money } from "@/modules/shared-kernel/money";

type CategoryTotal = {
  category: string;
  categoryLabel: string;
  expenseCount: number;
  total: Money;
};

export const expensesSummaryTool = defineAiTool({
  name: "get_expenses_summary",
  description:
    "Total business expenses for a period, broken down by expense category, largest category first.",
  category: "read",
  permission: "report:read",
  inputSchema: expensesSummaryInputSchema,
  outputSchema: expensesSummaryOutputSchema,
  async execute(input, context) {
    const range = resolveAiToolPeriod({
      period: input,
      timezone: context.timezone,
    });

    const report = await getExpenseReport({
      tenantId: context.tenantId,
      range,
      expenses: context.repositories.expenses,
    });

    const totals = new Map<string, CategoryTotal>();
    for (const row of report.rows) {
      const current = totals.get(row.category);
      if (current) {
        current.expenseCount += 1;
        current.total = addMoney(current.total, row.grandTotal);
        continue;
      }
      totals.set(row.category, {
        category: row.category,
        categoryLabel: row.categoryLabel,
        expenseCount: 1,
        total: row.grandTotal,
      });
    }

    const byCategory = [...totals.values()]
      .sort((a, b) =>
        a.total.amountMinor === b.total.amountMinor
          ? 0
          : a.total.amountMinor > b.total.amountMinor
            ? -1
            : 1
      )
      .map((entry) => ({
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        expenseCount: entry.expenseCount,
        total: toMoneyView(entry.total),
      }));

    return {
      range: report.range,
      expenseCount: report.expenseCount,
      total: toMoneyView(report.total),
      totalTax: toMoneyView(report.totalTax),
      byCategory,
    };
  },
});
