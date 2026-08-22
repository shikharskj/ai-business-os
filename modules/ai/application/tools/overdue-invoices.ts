import { defineAiTool } from "@/modules/ai/domain/define-tool";
import { daysBetween, toMoneyView } from "@/modules/ai/domain/tool-output";
import {
  overdueInvoicesInputSchema,
  overdueInvoicesOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import { getReceivablesReport } from "@/modules/reporting";
import { addMoney, money } from "@/modules/shared-kernel/money";

export const overdueInvoicesTool = defineAiTool({
  name: "get_overdue_invoices",
  description:
    "Unpaid customer invoices whose due date has passed, most overdue first, with the outstanding amount on each.",
  category: "read",
  permission: "invoice:read",
  autonomyLevel: "L0",
  inputSchema: overdueInvoicesInputSchema,
  outputSchema: overdueInvoicesOutputSchema,
  async execute(input, context) {
    const report = await getReceivablesReport({
      tenantId: context.tenantId,
      timezone: context.timezone,
      currency: context.currency,
      sales: context.repositories.sales,
      payments: context.repositories.payments,
    });

    const overdue = report.rows
      .flatMap((row) => {
        const dueOn = row.dueOn;
        if (!dueOn || dueOn >= report.asOf) {
          return [];
        }
        return [
          {
            invoiceId: row.invoiceId,
            invoiceNumber: row.invoiceNumber,
            customerId: row.customerId,
            customerName: row.customerName,
            dueOn,
            daysOverdue: daysBetween(dueOn, report.asOf),
            outstanding: row.outstanding,
          },
        ];
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    let totalOverdue = money(0n, context.currency);
    for (const row of overdue) {
      totalOverdue = addMoney(totalOverdue, row.outstanding);
    }

    return {
      asOf: report.asOf,
      invoiceCount: overdue.length,
      totalOverdue: toMoneyView(totalOverdue),
      invoices: overdue.slice(0, input.limit).map((row) => ({
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
        customerId: row.customerId,
        customerName: row.customerName,
        dueOn: row.dueOn,
        daysOverdue: row.daysOverdue,
        outstanding: toMoneyView(row.outstanding),
      })),
    };
  },
});
