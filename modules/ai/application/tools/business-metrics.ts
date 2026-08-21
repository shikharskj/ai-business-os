import { resolveAiToolPeriod } from "@/modules/ai/application/tool-period";
import { defineAiTool } from "@/modules/ai/domain/define-tool";
import { toMoneyView } from "@/modules/ai/domain/tool-output";
import {
  businessMetricsInputSchema,
  businessMetricsOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import { getDashboardOverview } from "@/modules/reporting";

export const businessMetricsTool = defineAiTool({
  name: "get_business_metrics",
  description:
    "Headline business metrics for a period: revenue, expenses, profit, receivables, payables, money received and paid, overdue invoices, and low-stock count. Same figures as the dashboard.",
  category: "read",
  permission: "report:read",
  inputSchema: businessMetricsInputSchema,
  outputSchema: businessMetricsOutputSchema,
  async execute(input, context) {
    const range = resolveAiToolPeriod({
      period: input,
      timezone: context.timezone,
    });

    const overview = await getDashboardOverview({
      tenantId: context.tenantId,
      timezone: context.timezone,
      lowStockThresholdMajor: context.lowStockThresholdMajor,
      range,
      sales: context.repositories.sales,
      purchases: context.repositories.purchases,
      expenses: context.repositories.expenses,
      payments: context.repositories.payments,
      supplierPayments: context.repositories.supplierPayments,
      catalog: context.repositories.catalog,
      inventory: context.repositories.inventory,
    });

    return {
      range: {
        fromDate: overview.range.fromDate,
        toDate: overview.range.toDate,
        label: overview.range.label,
      },
      revenue: toMoneyView(overview.revenue),
      expenses: toMoneyView(overview.expenses),
      profit: toMoneyView(overview.profit),
      receivables: toMoneyView(overview.receivables),
      payables: toMoneyView(overview.payables),
      receiptsInPeriod: toMoneyView(overview.receiptsInPeriod),
      paymentsOutInPeriod: toMoneyView(overview.paymentsOutInPeriod),
      overdueInvoiceCount: overview.overdueInvoiceCount,
      overdueOutstanding: toMoneyView(overview.overdueOutstanding),
      lowStockCount: overview.lowStockCount,
    };
  },
});
