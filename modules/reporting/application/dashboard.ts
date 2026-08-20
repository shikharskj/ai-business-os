import type { CatalogRepository } from "@/modules/catalog";
import type { ExpenseRepository } from "@/modules/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/modules/expenses/domain/types";
import {
  listLowStockProducts,
  parseLowStockThreshold,
  type InventoryRepository,
} from "@/modules/inventory";
import { remainingOutstanding } from "@/modules/payments/domain/allocation";
import type { PaymentRepository, SupplierPaymentRepository } from "@/modules/payments";
import {
  PAYABLE_PURCHASE_STATUSES,
  type PurchasesRepository,
} from "@/modules/purchases";
import type { DashboardDateRange } from "@/modules/reporting/domain/dashboard-range";
import type {
  DashboardAlert,
  DashboardOverview,
  DashboardSeriesPoint,
} from "@/modules/reporting/domain/dashboard-types";
import { GST_SALES_STATUSES } from "@/modules/reporting/domain/gst-types";
import {
  RECEIVABLE_INVOICE_STATUSES,
  type SalesRepository,
} from "@/modules/sales";
import { todayInTimezone, type BusinessDate } from "@/modules/shared-kernel/dates";
import {
  addMoney,
  money,
  subtractMoney,
  type Money,
} from "@/modules/shared-kernel/money";

const RECENT_LIMIT = 5;
const SERIES_DAY_CAP = 62;

export type DashboardDeps = {
  tenantId: string;
  timezone: string;
  lowStockThresholdMajor: string;
  range: DashboardDateRange;
  sales: SalesRepository;
  purchases: PurchasesRepository;
  expenses: ExpenseRepository;
  payments: PaymentRepository;
  supplierPayments: SupplierPaymentRepository;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
};

function zeroMoney(): Money {
  return money(0n);
}

function eachDateInclusive(from: BusinessDate, to: BusinessDate): BusinessDate[] {
  const dates: BusinessDate[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10) as BusinessDate;
    dates.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (dates.length > SERIES_DAY_CAP) {
      break;
    }
  }
  return dates;
}

export async function getDashboardOverview(
  input: DashboardDeps
): Promise<DashboardOverview> {
  const { fromDate, toDate } = input.range;
  const today = todayInTimezone(input.timezone);

  const [
    periodInvoices,
    receivableInvoices,
    payablePurchases,
    periodExpenses,
    receipts,
    supplierPayments,
    lowStock,
  ] = await Promise.all([
    input.sales.listInvoices({
      tenantId: input.tenantId,
      statuses: GST_SALES_STATUSES,
      fromDate,
      toDate,
    }),
    input.sales.listInvoices({
      tenantId: input.tenantId,
      statuses: RECEIVABLE_INVOICE_STATUSES,
    }),
    input.purchases.listPurchases({
      tenantId: input.tenantId,
      statuses: [...PAYABLE_PURCHASE_STATUSES],
    }),
    input.expenses.listExpenses({
      tenantId: input.tenantId,
      fromDate,
      toDate,
    }),
    input.payments.listPayments({
      tenantId: input.tenantId,
      fromDate,
      toDate,
    }),
    input.supplierPayments.listPayments({
      tenantId: input.tenantId,
      fromDate,
      toDate,
    }),
    listLowStockProducts({
      tenantId: input.tenantId,
      lowStockThreshold: parseLowStockThreshold(input.lowStockThresholdMajor),
      catalog: input.catalog,
      inventory: input.inventory,
    }),
  ]);

  const invoiceIds = [
    ...new Set([
      ...periodInvoices.map((row) => row.id),
      ...receivableInvoices.map((row) => row.id),
    ]),
  ];
  const purchaseIds = payablePurchases.map((row) => row.id);

  const [invoiceAllocated, purchaseAllocated] = await Promise.all([
    input.payments.allocatedTotalsForInvoices(input.tenantId, invoiceIds),
    input.supplierPayments.allocatedTotalsForPurchases(input.tenantId, purchaseIds),
  ]);

  let revenue = zeroMoney();
  for (const invoice of periodInvoices) {
    if (invoice.tenantId !== input.tenantId) continue;
    revenue = addMoney(revenue, invoice.taxableAmount);
  }

  let expensesTotal = zeroMoney();
  for (const expense of periodExpenses) {
    if (expense.tenantId !== input.tenantId) continue;
    expensesTotal = addMoney(expensesTotal, expense.grandTotal);
  }

  const profit = subtractMoney(revenue, expensesTotal);

  let receivables = zeroMoney();
  for (const invoice of receivableInvoices) {
    if (invoice.tenantId !== input.tenantId) continue;
    const allocated = invoiceAllocated.get(invoice.id) ?? zeroMoney();
    receivables = addMoney(
      receivables,
      remainingOutstanding(invoice.grandTotal, allocated)
    );
  }

  let payables = zeroMoney();
  for (const purchase of payablePurchases) {
    if (purchase.tenantId !== input.tenantId) continue;
    const allocated = purchaseAllocated.get(purchase.id) ?? zeroMoney();
    payables = addMoney(
      payables,
      remainingOutstanding(purchase.grandTotal, allocated)
    );
  }

  let receiptsInPeriod = zeroMoney();
  for (const payment of receipts) {
    if (payment.tenantId !== input.tenantId) continue;
    receiptsInPeriod = addMoney(receiptsInPeriod, payment.amount);
  }

  let paymentsOutInPeriod = zeroMoney();
  for (const payment of supplierPayments) {
    if (payment.tenantId !== input.tenantId) continue;
    paymentsOutInPeriod = addMoney(paymentsOutInPeriod, payment.amount);
  }

  let overdueInvoiceCount = 0;
  let overdueOutstanding = zeroMoney();
  const alerts: DashboardAlert[] = [];

  for (const invoice of receivableInvoices) {
    if (invoice.tenantId !== input.tenantId) continue;
    if (!invoice.dueOn || invoice.dueOn >= today) continue;
    const allocated = invoiceAllocated.get(invoice.id) ?? zeroMoney();
    const outstanding = remainingOutstanding(invoice.grandTotal, allocated);
    if (outstanding.amountMinor <= 0n) continue;
    overdueInvoiceCount += 1;
    overdueOutstanding = addMoney(overdueOutstanding, outstanding);
    if (alerts.filter((a) => a.kind === "OVERDUE_INVOICE").length < 5) {
      alerts.push({
        kind: "OVERDUE_INVOICE",
        title: `Overdue ${invoice.number}`,
        detail: `${invoice.customerName} · due ${invoice.dueOn}`,
        href: `/app/sales/invoices/${invoice.id}`,
      });
    }
  }

  for (const stock of lowStock.slice(0, 5)) {
    alerts.push({
      kind: "LOW_STOCK",
      title: `Low stock · ${stock.productName}`,
      detail: `SKU ${stock.sku}`,
      href: `/app/inventory/stock/${stock.productId}`,
    });
  }

  const allRecentInvoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    statuses: GST_SALES_STATUSES,
  });
  const recentInvoices = allRecentInvoices
    .filter((row) => row.tenantId === input.tenantId)
    .slice(0, RECENT_LIMIT)
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      customerName: invoice.customerName,
      issuedOn: invoice.issuedOn,
      status: invoice.status,
      grandTotal: invoice.grandTotal,
    }));

  const allRecentExpenses = await input.expenses.listExpenses({
    tenantId: input.tenantId,
  });
  const recentExpenses = allRecentExpenses
    .filter((row) => row.tenantId === input.tenantId)
    .slice(0, RECENT_LIMIT)
    .map((expense) => ({
      id: expense.id,
      number: expense.number,
      category: EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category,
      incurredOn: expense.incurredOn,
      grandTotal: expense.grandTotal,
    }));

  const salesByDate = new Map<string, Money>();
  for (const invoice of periodInvoices) {
    if (invoice.tenantId !== input.tenantId) continue;
    const prev = salesByDate.get(invoice.issuedOn) ?? zeroMoney();
    salesByDate.set(invoice.issuedOn, addMoney(prev, invoice.taxableAmount));
  }
  const expensesByDate = new Map<string, Money>();
  for (const expense of periodExpenses) {
    if (expense.tenantId !== input.tenantId) continue;
    const prev = expensesByDate.get(expense.incurredOn) ?? zeroMoney();
    expensesByDate.set(expense.incurredOn, addMoney(prev, expense.grandTotal));
  }

  const series: DashboardSeriesPoint[] = eachDateInclusive(fromDate, toDate).map(
    (date) => ({
      date,
      sales: salesByDate.get(date) ?? zeroMoney(),
      expenses: expensesByDate.get(date) ?? zeroMoney(),
    })
  );

  return {
    range: input.range,
    revenue,
    expenses: expensesTotal,
    profit,
    receivables,
    payables,
    receiptsInPeriod,
    paymentsOutInPeriod,
    overdueInvoiceCount,
    overdueOutstanding,
    lowStockCount: lowStock.length,
    recentInvoices,
    recentExpenses,
    series,
    alerts,
  };
}
