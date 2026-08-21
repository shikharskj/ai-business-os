import { defineAiTool } from "@/modules/ai/domain/define-tool";
import { AiToolResourceNotFoundError } from "@/modules/ai/domain/errors";
import { toMoneyView } from "@/modules/ai/domain/tool-output";
import {
  receivablesInputSchema,
  receivablesOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import { getReceivablesReport } from "@/modules/reporting";
import { addMoney, money, type Money } from "@/modules/shared-kernel/money";

type CustomerOutstanding = {
  customerId: string;
  customerName: string;
  outstanding: Money;
  invoiceCount: number;
  oldestDueOn: string | null;
};

export const receivablesTool = defineAiTool({
  name: "get_outstanding_receivables",
  description:
    "Money customers currently owe the business, grouped by customer with the largest balance first. Optionally scoped to one customer.",
  category: "read",
  permission: "report:read",
  inputSchema: receivablesInputSchema,
  outputSchema: receivablesOutputSchema,
  async execute(input, context) {
    if (input.customerId) {
      // Resolve inside the tenant so a customer id the model picked up
      // elsewhere can never read another business's receivables.
      const customer = await context.repositories.party.findCustomerById(
        context.tenantId,
        input.customerId
      );
      if (!customer) {
        throw new AiToolResourceNotFoundError("That customer");
      }
    }

    const report = await getReceivablesReport({
      tenantId: context.tenantId,
      timezone: context.timezone,
      sales: context.repositories.sales,
      payments: context.repositories.payments,
    });

    const rows = input.customerId
      ? report.rows.filter((row) => row.customerId === input.customerId)
      : report.rows;

    const byCustomer = new Map<string, CustomerOutstanding>();
    // Same zero basis as the receivables report so currency/scale always match.
    let totalOutstanding = money(0n);

    for (const row of rows) {
      totalOutstanding = addMoney(totalOutstanding, row.outstanding);
      const current = byCustomer.get(row.customerId);
      if (current) {
        current.outstanding = addMoney(current.outstanding, row.outstanding);
        current.invoiceCount += 1;
        if (row.dueOn && (!current.oldestDueOn || row.dueOn < current.oldestDueOn)) {
          current.oldestDueOn = row.dueOn;
        }
        continue;
      }
      byCustomer.set(row.customerId, {
        customerId: row.customerId,
        customerName: row.customerName,
        outstanding: row.outstanding,
        invoiceCount: 1,
        oldestDueOn: row.dueOn ?? null,
      });
    }

    const customers = [...byCustomer.values()]
      .sort((a, b) =>
        a.outstanding.amountMinor === b.outstanding.amountMinor
          ? 0
          : a.outstanding.amountMinor > b.outstanding.amountMinor
            ? -1
            : 1
      )
      .slice(0, input.limit)
      .map((entry) => ({
        customerId: entry.customerId,
        customerName: entry.customerName,
        outstanding: toMoneyView(entry.outstanding),
        invoiceCount: entry.invoiceCount,
        oldestDueOn: entry.oldestDueOn,
      }));

    return {
      asOf: report.asOf,
      totalOutstanding: toMoneyView(totalOutstanding),
      invoiceCount: rows.length,
      customerCount: byCustomer.size,
      customers,
    };
  },
});
