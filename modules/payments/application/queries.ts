import { remainingOutstanding } from "@/modules/payments/domain/allocation";
import { PaymentNotFoundError } from "@/modules/payments/domain/errors";
import type {
  CustomerOutstanding,
  CustomerPayment,
  InvoiceOutstanding,
  PaymentListFilter,
} from "@/modules/payments/domain/types";
import type { PaymentRepository } from "@/modules/payments/infrastructure/repositories";
import {
  isPostedInvoiceStatus,
  RECEIVABLE_INVOICE_STATUSES,
} from "@/modules/sales";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import { money, addMoney } from "@/modules/shared-kernel/money";

export async function getPayment(input: {
  tenantId: string;
  paymentId: string;
  payments: PaymentRepository;
}): Promise<CustomerPayment> {
  const payment = await input.payments.findPaymentById(input.tenantId, input.paymentId);
  if (!payment) {
    throw new PaymentNotFoundError();
  }
  return payment;
}

export async function listPaymentsPage(input: {
  tenantId: string;
  query?: string;
  customerId?: string;
  method?: PaymentListFilter["method"];
  fromDate?: PaymentListFilter["fromDate"];
  toDate?: PaymentListFilter["toDate"];
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  payments: PaymentRepository;
}) {
  return input.payments.listPaymentsPage({
    tenantId: input.tenantId,
    query: input.query,
    customerId: input.customerId,
    method: input.method,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listPayments(input: {
  tenantId: string;
  query?: string;
  customerId?: string;
  payments: PaymentRepository;
}): Promise<CustomerPayment[]> {
  const filter: PaymentListFilter = {
    tenantId: input.tenantId,
    query: input.query,
    customerId: input.customerId,
  };
  return input.payments.listPayments(filter);
}

export async function listPaymentsForInvoice(input: {
  tenantId: string;
  invoiceId: string;
  payments: PaymentRepository;
}): Promise<CustomerPayment[]> {
  return input.payments.listPaymentsForInvoice(input.tenantId, input.invoiceId);
}

async function outstandingForInvoices(input: {
  tenantId: string;
  invoices: Awaited<ReturnType<SalesRepository["listInvoices"]>>;
  payments: PaymentRepository;
}): Promise<InvoiceOutstanding[]> {
  const allocated = await input.payments.allocatedTotalsForInvoices(
    input.tenantId,
    input.invoices.map((invoice) => invoice.id)
  );
  return input.invoices.map((invoice) => {
    const allocatedAmount = allocated.get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      status: invoice.status,
      issuedOn: invoice.issuedOn,
      dueOn: invoice.dueOn,
      grandTotal: invoice.grandTotal,
      allocated: allocatedAmount,
      outstanding: remainingOutstanding(invoice.grandTotal, allocatedAmount),
    };
  });
}

export async function getInvoiceOutstanding(input: {
  tenantId: string;
  invoiceId: string;
  sales: SalesRepository;
  payments: PaymentRepository;
}): Promise<InvoiceOutstanding | null> {
  const invoice = await input.sales.findInvoiceById(input.tenantId, input.invoiceId);
  if (!invoice) {
    return null;
  }
  const [row] = await outstandingForInvoices({
    tenantId: input.tenantId,
    invoices: [invoice],
    payments: input.payments,
  });
  return row ?? null;
}

export async function listOpenReceivableInvoices(input: {
  tenantId: string;
  customerId: string;
  sales: SalesRepository;
  payments: PaymentRepository;
}): Promise<InvoiceOutstanding[]> {
  const invoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    customerId: input.customerId,
    statuses: RECEIVABLE_INVOICE_STATUSES,
  });
  const rows = await outstandingForInvoices({
    tenantId: input.tenantId,
    invoices,
    payments: input.payments,
  });
  return rows.filter((row) => row.outstanding.amountMinor > 0n);
}

export async function getCustomerOutstanding(input: {
  tenantId: string;
  customerId: string;
  sales: SalesRepository;
  payments: PaymentRepository;
}): Promise<CustomerOutstanding> {
  const invoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    customerId: input.customerId,
  });
  const posted = invoices.filter((invoice) => isPostedInvoiceStatus(invoice.status));
  const rows = await outstandingForInvoices({
    tenantId: input.tenantId,
    invoices: posted,
    payments: input.payments,
  });
  const outstanding = rows.reduce(
    (sum, row) => addMoney(sum, row.outstanding),
    money(0n)
  );
  return {
    customerId: input.customerId,
    outstanding,
    openInvoiceCount: rows.filter((row) => row.outstanding.amountMinor > 0n).length,
    hasPostedInvoices: posted.length > 0,
  };
}

export async function outstandingByCustomerIds(input: {
  tenantId: string;
  customerIds: string[];
  sales: SalesRepository;
  payments: PaymentRepository;
}): Promise<Map<string, import("@/modules/shared-kernel/money").Money>> {
  if (input.customerIds.length === 0) {
    return new Map();
  }

  const invoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    customerIds: input.customerIds,
    statuses: RECEIVABLE_INVOICE_STATUSES,
  });
  const rows = await outstandingForInvoices({
    tenantId: input.tenantId,
    invoices,
    payments: input.payments,
  });

  const totals = new Map<string, ReturnType<typeof money>>();
  for (const row of rows) {
    if (row.outstanding.amountMinor <= 0n) {
      continue;
    }
    const current = totals.get(row.customerId) ?? money(0n);
    totals.set(row.customerId, addMoney(current, row.outstanding));
  }
  return totals;
}
