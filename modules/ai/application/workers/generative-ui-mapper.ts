import type { DashboardView } from "@/modules/ai/domain/dashboard-view.schema";
import type {
  AnomalyBundle,
  FactsBundle,
  InsightsBundle,
} from "@/modules/ai/domain/supervisor-types";
import { toMajorString } from "@/modules/shared-kernel/money";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

function parseSeries(factValue: string): Array<{
  date: string;
  label: string;
  value: number;
}> {
  try {
    const parsed = JSON.parse(factValue) as Array<{
      date: string;
      label: string;
      value: number;
    }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sparkPoints(series: Array<{ value: number }>): number[] {
  return series.map((p) => p.value);
}

function moneyValue(
  amount: { amountMinor: bigint; currency: string; scale: number },
  factId: string
) {
  return {
    amountMinor: amount.amountMinor.toString(),
    currency: amount.currency,
    scale: amount.scale,
    factId,
  };
}

/**
 * Generative UI Mapper — builds Dashboard-01 default layout from facts/insights/anomalies.
 * Deterministic (no LLM); every MetricCard/chart cites fact ids.
 */
export function runGenerativeUiMapper(input: {
  facts: FactsBundle;
  insights: InsightsBundle;
  anomalies: AnomalyBundle;
  source: "supervisor" | "fallback";
}): DashboardView {
  const { overview } = input.facts;
  const salesSeries = parseSeries(
    input.facts.facts.find((f) => f.id === "fact.series.sales")?.value ?? "[]"
  );
  const expenseSeries = parseSeries(
    input.facts.facts.find((f) => f.id === "fact.series.expenses")?.value ?? "[]"
  );

  const profitTone =
    overview.profit.amountMinor > 0n
      ? ("success" as const)
      : overview.profit.amountMinor < 0n
        ? ("danger" as const)
        : ("neutral" as const);

  const overdueTone =
    overview.overdueInvoiceCount > 0 ? ("danger" as const) : undefined;
  const overdueCaption =
    overview.overdueInvoiceCount === 0
      ? "No overdue invoices"
      : `${overview.overdueInvoiceCount} invoice${overview.overdueInvoiceCount === 1 ? "" : "s"} overdue`;

  // Match Recent activity: include both invoice and expense lists. Period KPIs
  // alone miss older expenses outside the selected range.
  const isEmpty =
    overview.revenue.amountMinor === 0n &&
    overview.expenses.amountMinor === 0n &&
    overview.receivables.amountMinor === 0n &&
    overview.payables.amountMinor === 0n &&
    overview.recentInvoices.length === 0 &&
    overview.recentExpenses.length === 0 &&
    overview.alerts.length === 0;

  const insightComponents = input.anomalies.anomalies.slice(0, 4).map((a) => ({
    type: "InsightBanner" as const,
    id: a.id,
    title: a.title,
    detail: a.detail,
    href: a.href,
    severity: a.severity,
    kind: a.kind,
    dismissible: true,
  }));

  // Surface one analyst recommendation as insight if no anomalies
  if (insightComponents.length === 0) {
    const rec = input.insights.insights.find((i) => i.kind === "recommendation");
    if (rec) {
      insightComponents.push({
        type: "InsightBanner",
        id: rec.id,
        title: rec.title,
        detail: rec.detail,
        href: undefined,
        severity: "info",
        kind: rec.kind,
        dismissible: true,
      });
    }
  }

  const activityItems = [
    ...overview.recentInvoices.map((invoice) => ({
      id: invoice.id,
      date: invoice.issuedOn,
      title: invoice.number,
      subtitle: `${invoice.customerName} · ${invoice.issuedOn}`,
      href: `/app/sales/invoices/${invoice.id}`,
      amount: moneyValue(invoice.grandTotal, `fact.invoice.${invoice.id}`),
      badge: invoice.status,
      badgeTone: statusTone(invoice.status as SalesInvoiceStatus),
    })),
    ...overview.recentExpenses.map((expense) => ({
      id: expense.id,
      date: expense.incurredOn,
      title: expense.number,
      subtitle: `${expense.category} · ${expense.incurredOn}`,
      href: `/app/expenses/${expense.id}`,
      amount: moneyValue(expense.grandTotal, `fact.expense.${expense.id}`),
      badge: "Expense",
      badgeTone: "neutral" as const,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 8)
    .map(({ date: _date, ...item }) => item);

  return {
    version: 1,
    period: {
      from: input.facts.fromDate,
      to: input.facts.toDate,
      label: input.facts.periodLabel,
    },
    source: input.source,
    regions: [
      {
        id: "insights",
        layout: "stack",
        components: insightComponents,
      },
      {
        id: "empty",
        layout: "stack",
        components: isEmpty
          ? [
              {
                type: "EmptyState",
                id: "empty.welcome",
                title: "Welcome",
                description:
                  "No sales, expenses, or open balances yet. Create an invoice or record an expense to see KPIs here.",
                actions: [
                  { label: "New invoice", href: "/app/sales/invoices/new" },
                  { label: "Record expense", href: "/app/expenses/new" },
                ],
              },
            ]
          : [],
      },
      {
        id: "kpi",
        layout: "grid-4",
        components: [
          {
            type: "MetricCard",
            id: "kpi.sales",
            title: "Sales",
            href: "/app/reports/sales",
            value: moneyValue(overview.revenue, "fact.revenue"),
            caption: "Taxable sales in period",
            sparkline:
              salesSeries.length > 1
                ? {
                    factId: "fact.series.sales",
                    points: sparkPoints(salesSeries),
                  }
                : undefined,
          },
          {
            type: "MetricCard",
            id: "kpi.expenses",
            title: "Expenses",
            href: "/app/reports/expenses",
            value: moneyValue(overview.expenses, "fact.expenses"),
            caption: "Expenses in period",
            sparkline:
              expenseSeries.length > 1
                ? {
                    factId: "fact.series.expenses",
                    points: sparkPoints(expenseSeries),
                  }
                : undefined,
          },
          {
            type: "MetricCard",
            id: "kpi.profit",
            title: "Profit",
            href: "/app/reports/profit",
            value: moneyValue(overview.profit, "fact.profit"),
            caption: "Sales − expenses",
            tone: profitTone,
          },
          {
            type: "MetricCard",
            id: "kpi.receivables",
            title: "Receivables",
            href: "/app/reports/receivables",
            value: moneyValue(overview.receivables, "fact.receivables"),
            caption: "Open customer balances",
          },
          {
            type: "MetricCard",
            id: "kpi.payables",
            title: "Payables",
            href: "/app/reports/payables",
            value: moneyValue(overview.payables, "fact.payables"),
            caption: "Open supplier balances",
          },
          {
            type: "MetricCard",
            id: "kpi.overdue",
            title: "Overdue",
            href: "/app/reports/receivables",
            value: moneyValue(
              overview.overdueOutstanding,
              "fact.overdueOutstanding"
            ),
            caption: overdueCaption,
            tone: overdueTone,
          },
          {
            type: "MetricCard",
            id: "kpi.receipts",
            title: "Cash in",
            href: "/app/sales/payments",
            value: moneyValue(overview.receiptsInPeriod, "fact.receipts"),
            caption: "Receipts in period",
          },
          {
            type: "MetricCard",
            id: "kpi.paymentsOut",
            title: "Cash out",
            href: "/app/purchases/payments",
            value: moneyValue(overview.paymentsOutInPeriod, "fact.paymentsOut"),
            caption: "Supplier payments in period",
          },
        ],
      },
      {
        id: "main",
        layout: "grid-2-1",
        components: [
          {
            type: "AreaChart",
            id: "chart.sales-expenses",
            title: "Sales vs expenses",
            description:
              "Daily totals for the selected period (display only — not source of truth).",
            summary: `Sales ${toMajorString(overview.revenue)} and expenses ${toMajorString(overview.expenses)} for ${input.facts.periodLabel}.`,
            series: [
              {
                key: "sales",
                label: "Sales",
                factId: "fact.series.sales",
                points: salesSeries,
              },
              {
                key: "expenses",
                label: "Expenses",
                factId: "fact.series.expenses",
                points: expenseSeries,
              },
            ],
          },
          {
            type: "ActivityList",
            id: "activity.recent",
            title: "Recent activity",
            description: "Latest posted invoices and expenses.",
            items: activityItems,
          },
        ],
      },
    ],
  };
}

function statusTone(
  status: SalesInvoiceStatus
): "neutral" | "success" | "danger" | "warning" | "info" {
  if (status === "PAID") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "PARTIALLY_PAID" || status === "UNPAID") return "warning";
  if (status === "POSTED") return "info";
  return "neutral";
}
