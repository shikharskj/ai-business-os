import type { DashboardDeps } from "@/modules/reporting/application/dashboard";
import { getDashboardOverview } from "@/modules/reporting/application/dashboard";
import type { DashboardOverview } from "@/modules/reporting/domain/dashboard-types";
import type {
  DashboardFact,
  FactsBundle,
} from "@/modules/ai/domain/supervisor-types";
import { toMajorString } from "@/modules/shared-kernel/money";

function moneyFact(
  id: string,
  label: string,
  amount: { amountMinor: bigint; currency: string; scale: number }
): DashboardFact {
  return {
    id,
    kind: "money",
    label,
    value: amount.amountMinor.toString(),
    currency: amount.currency,
    scale: amount.scale,
  };
}

function buildFacts(overview: DashboardOverview): DashboardFact[] {
  const facts: DashboardFact[] = [
    moneyFact("fact.revenue", "Sales (taxable)", overview.revenue),
    moneyFact("fact.expenses", "Expenses", overview.expenses),
    moneyFact("fact.profit", "Profit", overview.profit),
    moneyFact("fact.receivables", "Receivables", overview.receivables),
    moneyFact("fact.payables", "Payables", overview.payables),
    moneyFact("fact.receipts", "Receipts in period", overview.receiptsInPeriod),
    moneyFact("fact.paymentsOut", "Payments out in period", overview.paymentsOutInPeriod),
    moneyFact("fact.overdueOutstanding", "Overdue outstanding", overview.overdueOutstanding),
    {
      id: "fact.overdueCount",
      kind: "count",
      label: "Overdue invoice count",
      value: String(overview.overdueInvoiceCount),
    },
    {
      id: "fact.lowStockCount",
      kind: "count",
      label: "Low stock count",
      value: String(overview.lowStockCount),
    },
    {
      id: "fact.series.sales",
      kind: "series",
      label: "Daily sales series",
      value: JSON.stringify(
        overview.series.map((p) => ({
          date: p.date,
          label: p.date.slice(5),
          value: Number(toMajorString(p.sales)),
        }))
      ),
    },
    {
      id: "fact.series.expenses",
      kind: "series",
      label: "Daily expenses series",
      value: JSON.stringify(
        overview.series.map((p) => ({
          date: p.date,
          label: p.date.slice(5),
          value: Number(toMajorString(p.expenses)),
        }))
      ),
    },
  ];

  for (const invoice of overview.recentInvoices) {
    facts.push({
      ...moneyFact(
        `fact.invoice.${invoice.id}`,
        invoice.number,
        invoice.grandTotal
      ),
      href: `/app/sales/invoices/${invoice.id}`,
      meta: {
        party: invoice.customerName,
        status: invoice.status,
        date: invoice.issuedOn,
      },
    });
  }

  for (const expense of overview.recentExpenses) {
    facts.push({
      ...moneyFact(
        `fact.expense.${expense.id}`,
        expense.number,
        expense.grandTotal
      ),
      href: `/app/expenses/${expense.id}`,
      meta: {
        category: expense.category,
        date: expense.incurredOn,
      },
    });
  }

  for (const alert of overview.alerts) {
    facts.push({
      id: `fact.alert.${alert.kind}.${alert.href}`,
      kind: "alert",
      label: alert.title,
      value: alert.detail,
      href: alert.href,
      meta: { kind: alert.kind },
    });
  }

  return facts;
}

/** Data Fetcher worker — authoritative facts only via getDashboardOverview. */
export async function runDataFetcher(input: {
  tenantId: string;
  deps: DashboardDeps;
}): Promise<FactsBundle> {
  if (input.deps.tenantId !== input.tenantId) {
    throw new Error("Data Fetcher refused cross-tenant deps.");
  }

  const overview = await getDashboardOverview(input.deps);
  return {
    tenantId: input.tenantId,
    periodLabel: overview.range.label,
    fromDate: overview.range.fromDate,
    toDate: overview.range.toDate,
    overview,
    facts: buildFacts(overview),
  };
}
