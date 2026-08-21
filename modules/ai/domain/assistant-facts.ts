import type { AiAssistantFact } from "@/modules/ai/domain/assistant-types";
import type { AiToolName } from "@/modules/ai/domain/tool-types";
import {
  businessMetricsOutputSchema,
  cashPositionOutputSchema,
  expensesSummaryOutputSchema,
  lowStockOutputSchema,
  overdueInvoicesOutputSchema,
  paymentRemindersOutputSchema,
  receivablesOutputSchema,
  salesSummaryOutputSchema,
  type MoneyView,
} from "@/modules/ai/schemas/ai-tool.schema";
import { formatINR } from "@/modules/shared-kernel/format-money";
import { moneyFromMajor } from "@/modules/shared-kernel/money";

/** Facts per tool result, so one answer cannot bury the user in numbers. */
const MAX_DETAIL_ROWS = 5;

export function formatMoneyView(value: MoneyView): string {
  if (value.currency !== "INR") {
    return `${value.currency} ${value.amountMajor}`;
  }
  return formatINR(moneyFromMajor(value.amountMajor, value.currency));
}

function fact(input: {
  sourceTool: AiToolName;
  key: string;
  label: string;
  value: string;
  detail?: string | null;
  href?: string | null;
}): AiAssistantFact {
  return {
    id: `${input.sourceTool}:${input.key}`,
    label: input.label,
    value: input.value,
    detail: input.detail ?? null,
    sourceTool: input.sourceTool,
    href: input.href ?? null,
  };
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/**
 * Turns a validated tool result into displayable facts.
 *
 * This is the only producer of `AiAssistantFact`. Model text never reaches it,
 * so every number the UI presents as verified business data is traceable to the
 * tool named in `sourceTool`. Output that does not match its tool schema
 * produces no facts rather than a guess.
 */
export function factsFromToolResult(input: {
  toolName: string;
  output: unknown;
}): AiAssistantFact[] {
  switch (input.toolName) {
    case "get_outstanding_receivables":
      return receivablesFacts(input.output);
    case "get_overdue_invoices":
      return overdueFacts(input.output);
    case "get_sales_summary":
      return salesFacts(input.output);
    case "get_expenses_summary":
      return expensesFacts(input.output);
    case "get_low_stock_products":
      return lowStockFacts(input.output);
    case "get_business_metrics":
      return metricsFacts(input.output);
    case "get_cash_position":
      return cashPositionFacts(input.output);
    case "send_payment_reminders":
      return reminderFacts(input.output);
    default:
      return [];
  }
}

function receivablesFacts(output: unknown): AiAssistantFact[] {
  const parsed = receivablesOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }
  const data = parsed.data;
  const source: AiToolName = "get_outstanding_receivables";

  const facts = [
    fact({
      sourceTool: source,
      key: "total",
      label: "Outstanding receivables",
      value: formatMoneyView(data.totalOutstanding),
      detail: `Based on ${plural(data.invoiceCount, "unpaid invoice")} across ${plural(
        data.customerCount,
        "customer"
      )}, as of ${data.asOf}.`,
      href: "/app/reports/receivables",
    }),
  ];

  for (const customer of data.customers.slice(0, MAX_DETAIL_ROWS)) {
    facts.push(
      fact({
        sourceTool: source,
        key: `customer:${customer.customerId}`,
        label: customer.customerName,
        value: formatMoneyView(customer.outstanding),
        detail: customer.oldestDueOn
          ? `${plural(customer.invoiceCount, "invoice")} · oldest due ${customer.oldestDueOn}`
          : plural(customer.invoiceCount, "invoice"),
        href: `/app/sales/customers/${customer.customerId}`,
      })
    );
  }

  return facts;
}

function overdueFacts(output: unknown): AiAssistantFact[] {
  const parsed = overdueInvoicesOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }
  const data = parsed.data;
  const source: AiToolName = "get_overdue_invoices";

  const facts = [
    fact({
      sourceTool: source,
      key: "total",
      label: "Overdue amount",
      value: formatMoneyView(data.totalOverdue),
      detail: `${plural(data.invoiceCount, "invoice")} past due as of ${data.asOf}.`,
      href: "/app/sales/invoices",
    }),
  ];

  for (const invoice of data.invoices.slice(0, MAX_DETAIL_ROWS)) {
    facts.push(
      fact({
        sourceTool: source,
        key: `invoice:${invoice.invoiceId}`,
        label: `${invoice.invoiceNumber} · ${invoice.customerName}`,
        value: formatMoneyView(invoice.outstanding),
        detail: `Due ${invoice.dueOn} · ${plural(invoice.daysOverdue, "day")} overdue`,
        href: `/app/sales/invoices/${invoice.invoiceId}`,
      })
    );
  }

  return facts;
}

function salesFacts(output: unknown): AiAssistantFact[] {
  const parsed = salesSummaryOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }
  const data = parsed.data;
  const source: AiToolName = "get_sales_summary";

  return [
    fact({
      sourceTool: source,
      key: `sales:${data.range.fromDate}:${data.range.toDate}`,
      label: `Sales — ${data.range.label}`,
      value: formatMoneyView(data.grandTotal),
      detail: `${plural(data.invoiceCount, "invoice")} · ${formatMoneyView(
        data.totalTaxable
      )} taxable · ${formatMoneyView(data.totalTax)} tax`,
      href: "/app/reports/sales",
    }),
  ];
}

function expensesFacts(output: unknown): AiAssistantFact[] {
  const parsed = expensesSummaryOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }
  const data = parsed.data;
  const source: AiToolName = "get_expenses_summary";
  const top = data.byCategory
    .slice(0, 3)
    .map((row) => `${row.categoryLabel} ${formatMoneyView(row.total)}`)
    .join(" · ");

  return [
    fact({
      sourceTool: source,
      key: `expenses:${data.range.fromDate}:${data.range.toDate}`,
      label: `Expenses — ${data.range.label}`,
      value: formatMoneyView(data.total),
      detail: top
        ? `${plural(data.expenseCount, "expense")} · ${top}`
        : plural(data.expenseCount, "expense"),
      href: "/app/reports/expenses",
    }),
  ];
}

function lowStockFacts(output: unknown): AiAssistantFact[] {
  const parsed = lowStockOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }
  const data = parsed.data;
  const source: AiToolName = "get_low_stock_products";

  const facts = [
    fact({
      sourceTool: source,
      key: "count",
      label: "Products below the low-stock threshold",
      value: String(data.lowStockCount),
      detail: `Threshold ${data.lowStockThresholdMajor} · ${plural(
        data.trackedProductCount,
        "tracked product"
      )} as of ${data.asOf}.`,
      href: "/app/inventory/stock",
    }),
  ];

  for (const product of data.products.slice(0, MAX_DETAIL_ROWS)) {
    facts.push(
      fact({
        sourceTool: source,
        key: `product:${product.productId}`,
        label: product.sku ? `${product.name} (${product.sku})` : product.name,
        value: product.quantityMajor,
        detail: "Quantity on hand",
        href: `/app/inventory/stock/${product.productId}`,
      })
    );
  }

  return facts;
}

function metricsFacts(output: unknown): AiAssistantFact[] {
  const parsed = businessMetricsOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }
  const data = parsed.data;
  const source: AiToolName = "get_business_metrics";
  const period = `${data.range.fromDate}:${data.range.toDate}`;

  return [
    fact({
      sourceTool: source,
      key: `revenue:${period}`,
      label: `Revenue — ${data.range.label}`,
      value: formatMoneyView(data.revenue),
      href: "/app/reports/sales",
    }),
    fact({
      sourceTool: source,
      key: `expenses:${period}`,
      label: `Expenses — ${data.range.label}`,
      value: formatMoneyView(data.expenses),
      href: "/app/reports/expenses",
    }),
    fact({
      sourceTool: source,
      key: `profit:${period}`,
      label: `Profit — ${data.range.label}`,
      value: formatMoneyView(data.profit),
      href: "/app/reports/profit",
    }),
    fact({
      sourceTool: source,
      key: "receivables",
      label: "Receivables outstanding",
      value: formatMoneyView(data.receivables),
      href: "/app/reports/receivables",
    }),
    fact({
      sourceTool: source,
      key: "payables",
      label: "Payables outstanding",
      value: formatMoneyView(data.payables),
      href: "/app/reports/payables",
    }),
    fact({
      sourceTool: source,
      key: "overdue",
      label: "Overdue invoices",
      value: String(data.overdueInvoiceCount),
      detail: `${formatMoneyView(data.overdueOutstanding)} outstanding`,
      href: "/app/sales/invoices",
    }),
    fact({
      sourceTool: source,
      key: "low-stock",
      label: "Low stock products",
      value: String(data.lowStockCount),
      href: "/app/inventory/stock",
    }),
  ];
}

function cashPositionFacts(output: unknown): AiAssistantFact[] {
  const parsed = cashPositionOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }
  const data = parsed.data;
  const source: AiToolName = "get_cash_position";

  return [
    fact({
      sourceTool: source,
      key: data.total.factId,
      label: "Cash position",
      value: formatMoneyView(data.total),
      detail: "Ledger cash and bank account balances",
      href: "/app/accounting/accounts",
    }),
    fact({
      sourceTool: source,
      key: data.cash.factId,
      label: "Cash on hand",
      value: formatMoneyView(data.cash),
      href: "/app/accounting/ledger",
    }),
    fact({
      sourceTool: source,
      key: data.bank.factId,
      label: "Bank",
      value: formatMoneyView(data.bank),
      href: "/app/accounting/ledger",
    }),
  ];
}

function reminderFacts(output: unknown): AiAssistantFact[] {
  const parsed = paymentRemindersOutputSchema.safeParse(output);
  if (!parsed.success) {
    return [];
  }
  const data = parsed.data;
  const source: AiToolName = "send_payment_reminders";

  const facts = [
    fact({
      sourceTool: source,
      key: `sent:${data.asOf}`,
      label: "Payment reminders sent",
      value: String(data.sentCount),
      detail: `${data.requestedCount} requested · ${data.skippedCount} skipped · ${data.failedCount} failed, as of ${data.asOf}.`,
      href: "/app/sales/invoices",
    }),
  ];

  for (const reminder of data.reminders.slice(0, MAX_DETAIL_ROWS)) {
    facts.push(
      fact({
        sourceTool: source,
        key: `reminder:${reminder.invoiceId}`,
        label: reminder.invoiceNumber
          ? `${reminder.invoiceNumber} · ${reminder.customerName ?? "Customer"}`
          : reminder.invoiceId,
        value:
          REMINDER_STATUS_LABEL[reminder.status] ?? "Reminder status unknown",
        detail: reminder.outstanding
          ? `${formatMoneyView(reminder.outstanding)} outstanding`
          : null,
        href: `/app/sales/invoices/${reminder.invoiceId}`,
      })
    );
  }

  return facts;
}

const REMINDER_STATUS_LABEL: Record<string, string> = {
  sent: "Reminder sent",
  already_sent: "Already reminded today",
  not_overdue: "Not overdue — skipped",
  not_found: "Not found — skipped",
  failed: "Reminder failed",
};
