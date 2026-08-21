import { defineAiTool } from "@/modules/ai/domain/define-tool";
import { daysBetween, toMoneyView } from "@/modules/ai/domain/tool-output";
import {
  paymentRemindersInputSchema,
  paymentRemindersOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import { createInAppChannel } from "@/modules/notifications";
import { getReceivablesReport } from "@/modules/reporting";
import { formatINR } from "@/modules/shared-kernel/format-money";

type ReminderStatus = "sent" | "already_sent" | "not_overdue" | "not_found";

/**
 * The assistant's only mutation, and the reason the confirmation gate is
 * enforceable end to end (spec 28).
 *
 * The model chooses which invoices to chase; it does not author the reminder.
 * Customer, amount, and overdue age are re-derived from the receivables report
 * inside the caller's tenant, so a model that invents an invoice id or an
 * amount simply gets a skipped row. Delivery goes through the notification
 * channel, and `executeAiTool` audits the run.
 */
export const paymentRemindersTool = defineAiTool({
  name: "send_payment_reminders",
  description:
    "Send an in-app payment reminder for specific overdue customer invoices. Proposes the action only: it cannot run until the user confirms it in the app. Pass invoice ids returned by get_overdue_invoices.",
  category: "action",
  permission: "invoice:update",
  requiresConfirmation: true,
  inputSchema: paymentRemindersInputSchema,
  outputSchema: paymentRemindersOutputSchema,
  async execute(input, context) {
    const report = await getReceivablesReport({
      tenantId: context.tenantId,
      timezone: context.timezone,
      sales: context.repositories.sales,
      payments: context.repositories.payments,
    });

    const byId = new Map(report.rows.map((row) => [row.invoiceId, row]));
    const channel = createInAppChannel(context.repositories.notifications);
    const requested = [...new Set(input.invoiceIds)];

    const reminders: Array<{
      invoiceId: string;
      invoiceNumber: string | null;
      customerName: string | null;
      outstanding: ReturnType<typeof toMoneyView> | null;
      daysOverdue: number | null;
      status: ReminderStatus;
    }> = [];

    for (const invoiceId of requested) {
      const row = byId.get(invoiceId);
      if (!row) {
        reminders.push({
          invoiceId,
          invoiceNumber: null,
          customerName: null,
          outstanding: null,
          daysOverdue: null,
          status: "not_found",
        });
        continue;
      }

      if (!row.dueOn || row.dueOn >= report.asOf) {
        reminders.push({
          invoiceId,
          invoiceNumber: row.invoiceNumber,
          customerName: row.customerName,
          outstanding: toMoneyView(row.outstanding),
          daysOverdue: null,
          status: "not_overdue",
        });
        continue;
      }

      const daysOverdue = daysBetween(row.dueOn, report.asOf);
      const outstanding = toMoneyView(row.outstanding);
      const amount =
        outstanding.currency === "INR"
          ? formatINR(row.outstanding)
          : `${outstanding.currency} ${outstanding.amountMajor}`;

      const delivered = await channel.deliver({
        tenantId: context.tenantId,
        channel: "IN_APP",
        type: "INVOICE_OVERDUE",
        title: "Payment reminder",
        body: `${row.invoiceNumber} — ${row.customerName} owes ${amount}, overdue by ${daysOverdue} day${
          daysOverdue === 1 ? "" : "s"
        }.`,
        href: `/app/sales/invoices/${row.invoiceId}`,
        resourceType: "SalesInvoice",
        resourceId: row.invoiceId,
        // Same invoice, same business day, one reminder.
        idempotencyKey: `ai-payment-reminder:${row.invoiceId}:${report.asOf}`,
      });

      reminders.push({
        invoiceId,
        invoiceNumber: row.invoiceNumber,
        customerName: row.customerName,
        outstanding,
        daysOverdue,
        status: delivered ? "sent" : "already_sent",
      });
    }

    const sentCount = reminders.filter((row) => row.status === "sent").length;

    return {
      asOf: report.asOf,
      requestedCount: requested.length,
      sentCount,
      skippedCount: reminders.length - sentCount,
      reminders,
    };
  },
});
