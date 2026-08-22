import { resolveAiToolPeriod } from "@/modules/ai/application/tool-period";
import { defineAiTool } from "@/modules/ai/domain/define-tool";
import { toMoneyView } from "@/modules/ai/domain/tool-output";
import {
  salesSummaryInputSchema,
  salesSummaryOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import { getSalesReport } from "@/modules/reporting";

const LARGEST_INVOICE_COUNT = 5;

export const salesSummaryTool = defineAiTool({
  name: "get_sales_summary",
  description:
    "Total posted sales for a period: taxable value, tax, grand total, invoice count, and the largest invoices.",
  category: "read",
  permission: "report:read",
  autonomyLevel: "L0",
  inputSchema: salesSummaryInputSchema,
  outputSchema: salesSummaryOutputSchema,
  async execute(input, context) {
    const range = resolveAiToolPeriod({
      period: input,
      timezone: context.timezone,
    });

    const report = await getSalesReport({
      tenantId: context.tenantId,
      range,
      sales: context.repositories.sales,
    });

    const largestInvoices = [...report.rows]
      .sort((a, b) =>
        a.grandTotal.amountMinor === b.grandTotal.amountMinor
          ? 0
          : a.grandTotal.amountMinor > b.grandTotal.amountMinor
            ? -1
            : 1
      )
      .slice(0, LARGEST_INVOICE_COUNT)
      .map((row) => ({
        invoiceId: row.id,
        invoiceNumber: row.number,
        customerName: row.customerName,
        issuedOn: row.issuedOn,
        status: row.status,
        grandTotal: toMoneyView(row.grandTotal),
      }));

    return {
      range: report.range,
      invoiceCount: report.invoiceCount,
      totalTaxable: toMoneyView(report.totalTaxable),
      totalTax: toMoneyView(report.totalTax),
      grandTotal: toMoneyView(report.grandTotal),
      largestInvoices,
    };
  },
});
