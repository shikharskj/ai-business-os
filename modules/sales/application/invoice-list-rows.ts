import { remainingDocumentBalance } from "@/modules/payments/domain/allocation";
import type { PaymentRepository } from "@/modules/payments/infrastructure/repositories";
import { isInvoiceOverdue } from "@/modules/sales/domain/invoice-status";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { BusinessDate } from "@/modules/shared-kernel/dates";
import { money, type Money } from "@/modules/shared-kernel/money";

export type InvoiceListRow = SalesInvoice & {
  outstanding: Money;
  isOverdue: boolean;
};

export async function decorateInvoiceListRows(input: {
  tenantId: string;
  invoices: SalesInvoice[];
  payments: PaymentRepository;
  sales: SalesRepository;
  asOf: BusinessDate;
}): Promise<InvoiceListRow[]> {
  if (input.invoices.length === 0) {
    return [];
  }

  const invoiceIds = input.invoices.map((invoice) => invoice.id);
  const [allocated, credited] = await Promise.all([
    input.payments.allocatedTotalsForInvoices(input.tenantId, invoiceIds),
    input.sales.creditedTotalsForInvoices(input.tenantId, invoiceIds),
  ]);

  return input.invoices.map((invoice) => {
    const allocatedAmount =
      allocated.get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
    const creditedAmount =
      credited.get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
    const outstanding = remainingDocumentBalance(
      invoice.grandTotal,
      allocatedAmount,
      creditedAmount
    );
    return {
      ...invoice,
      outstanding,
      isOverdue: isInvoiceOverdue({
        dueOn: invoice.dueOn,
        status: invoice.status,
        outstandingMinor: outstanding.amountMinor,
        asOf: input.asOf,
      }),
    };
  });
}
