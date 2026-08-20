import type {
  AnalystInsight,
  FactsBundle,
  InsightsBundle,
} from "@/modules/ai/domain/supervisor-types";
import { formatINR } from "@/modules/shared-kernel/format-money";

/**
 * Data Analyst worker — deterministic comparisons only (no LLM required for MVP).
 * Labels insights as fact vs recommendation.
 */
export function runDataAnalyst(facts: FactsBundle): InsightsBundle {
  const insights: AnalystInsight[] = [];
  const { overview } = facts;

  const revenue = overview.revenue;
  const expenses = overview.expenses;
  const profit = overview.profit;

  insights.push({
    id: "insight.period-summary",
    kind: "fact",
    title: "Period summary",
    detail: `Sales ${formatINR(revenue)}, expenses ${formatINR(expenses)}, profit ${formatINR(profit)} for ${facts.periodLabel}.`,
    relatedFactIds: ["fact.revenue", "fact.expenses", "fact.profit"],
  });

  if (profit.amountMinor < 0n) {
    insights.push({
      id: "insight.profit-negative",
      kind: "recommendation",
      title: "Expenses exceed sales",
      detail:
        "Profit is negative for this period. Review large expense categories and overdue collections.",
      relatedFactIds: ["fact.profit", "fact.expenses"],
    });
  } else if (revenue.amountMinor > 0n && expenses.amountMinor > 0n) {
    const ratio = Number(expenses.amountMinor) / Number(revenue.amountMinor);
    if (ratio > 0.85) {
      insights.push({
        id: "insight.high-expense-ratio",
        kind: "recommendation",
        title: "High expense ratio",
        detail: `Expenses are ${Math.round(ratio * 100)}% of taxable sales this period.`,
        relatedFactIds: ["fact.revenue", "fact.expenses"],
      });
    }
  }

  if (overview.receivables.amountMinor > 0n) {
    insights.push({
      id: "insight.receivables",
      kind: "fact",
      title: "Open receivables",
      detail: `${formatINR(overview.receivables)} outstanding from customers.`,
      relatedFactIds: ["fact.receivables"],
    });
  }

  return { insights };
}
