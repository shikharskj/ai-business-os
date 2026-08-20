import type { CatalogRepository } from "@/modules/catalog";
import type { ExpenseRepository } from "@/modules/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/modules/expenses/domain/types";
import {
  formatQuantity,
  listStockPositions,
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
  ExpenseReport,
  InventoryReport,
  PayablesReport,
  ProfitReport,
  ReceivablesReport,
  SalesReport,
} from "@/modules/reporting/domain/business-report-types";
import { GST_SALES_STATUSES } from "@/modules/reporting/domain/gst-types";
import {
  RECEIVABLE_INVOICE_STATUSES,
  type SalesRepository,
} from "@/modules/sales";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import {
  addMoney,
  money,
  subtractMoney,
  type Money,
} from "@/modules/shared-kernel/money";

function zero(): Money {
  return money(0n);
}

export type BusinessReportDeps = {
  tenantId: string;
  timezone: string;
  range: DashboardDateRange;
  sales: SalesRepository;
  purchases: PurchasesRepository;
  expenses: ExpenseRepository;
  payments: PaymentRepository;
  supplierPayments: SupplierPaymentRepository;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
  lowStockThresholdMajor: string;
};

export async function getSalesReport(
  input: Pick<BusinessReportDeps, "tenantId" | "range" | "sales">
): Promise<SalesReport> {
  const invoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    statuses: GST_SALES_STATUSES,
    fromDate: input.range.fromDate,
    toDate: input.range.toDate,
  });

  let totalTaxable = zero();
  let totalTax = zero();
  let grandTotal = zero();
  const rows = invoices.map((invoice) => {
    totalTaxable = addMoney(totalTaxable, invoice.taxableAmount);
    totalTax = addMoney(totalTax, invoice.totalTax);
    grandTotal = addMoney(grandTotal, invoice.grandTotal);
    return {
      id: invoice.id,
      number: invoice.number,
      customerName: invoice.customerName,
      issuedOn: invoice.issuedOn,
      status: invoice.status,
      taxableAmount: invoice.taxableAmount,
      totalTax: invoice.totalTax,
      grandTotal: invoice.grandTotal,
    };
  });

  return {
    range: {
      fromDate: input.range.fromDate,
      toDate: input.range.toDate,
      label: input.range.label,
    },
    totalTaxable,
    totalTax,
    grandTotal,
    invoiceCount: rows.length,
    rows,
  };
}

export async function getExpenseReport(
  input: Pick<BusinessReportDeps, "tenantId" | "range" | "expenses">
): Promise<ExpenseReport> {
  const expenses = await input.expenses.listExpenses({
    tenantId: input.tenantId,
    fromDate: input.range.fromDate,
    toDate: input.range.toDate,
  });

  let total = zero();
  let totalTax = zero();
  let totalTaxable = zero();
  const rows = expenses.map((expense) => {
    total = addMoney(total, expense.grandTotal);
    totalTax = addMoney(totalTax, expense.totalTax);
    totalTaxable = addMoney(totalTaxable, expense.taxableAmount);
    return {
      id: expense.id,
      number: expense.number,
      category: expense.category,
      categoryLabel: EXPENSE_CATEGORY_LABELS[expense.category],
      incurredOn: expense.incurredOn,
      method: expense.method,
      grandTotal: expense.grandTotal,
      totalTax: expense.totalTax,
    };
  });

  return {
    range: {
      fromDate: input.range.fromDate,
      toDate: input.range.toDate,
      label: input.range.label,
    },
    total,
    totalTax,
    totalTaxable,
    expenseCount: rows.length,
    rows,
  };
}

export async function getProfitReport(
  input: Pick<BusinessReportDeps, "tenantId" | "range" | "sales" | "expenses">
): Promise<ProfitReport> {
  const [sales, expenses] = await Promise.all([
    getSalesReport(input),
    getExpenseReport(input),
  ]);
  return {
    range: sales.range,
    sales: sales.totalTaxable,
    expenses: expenses.totalTaxable,
    profit: subtractMoney(sales.totalTaxable, expenses.totalTaxable),
  };
}

export async function getReceivablesReport(
  input: Pick<BusinessReportDeps, "tenantId" | "timezone" | "sales" | "payments">
): Promise<ReceivablesReport> {
  const invoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    statuses: RECEIVABLE_INVOICE_STATUSES,
  });
  const allocated = await input.payments.allocatedTotalsForInvoices(
    input.tenantId,
    invoices.map((invoice) => invoice.id)
  );

  let totalOutstanding = zero();
  const rows = invoices
    .map((invoice) => {
      const allocatedAmount =
        allocated.get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
      const outstanding = remainingOutstanding(invoice.grandTotal, allocatedAmount);
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
        outstanding,
      };
    })
    .filter((row) => row.outstanding.amountMinor > 0n)
    .sort((a, b) => a.issuedOn.localeCompare(b.issuedOn));

  for (const row of rows) {
    totalOutstanding = addMoney(totalOutstanding, row.outstanding);
  }

  return {
    asOf: todayInTimezone(input.timezone),
    totalOutstanding,
    rowCount: rows.length,
    rows,
  };
}

export async function getPayablesReport(
  input: Pick<
    BusinessReportDeps,
    "tenantId" | "timezone" | "purchases" | "supplierPayments"
  >
): Promise<PayablesReport> {
  const purchases = await input.purchases.listPurchases({
    tenantId: input.tenantId,
    statuses: [...PAYABLE_PURCHASE_STATUSES],
  });
  const allocated = await input.supplierPayments.allocatedTotalsForPurchases(
    input.tenantId,
    purchases.map((purchase) => purchase.id)
  );

  let totalOutstanding = zero();
  const rows = purchases
    .map((purchase) => {
      const allocatedAmount =
        allocated.get(purchase.id) ?? money(0n, purchase.grandTotal.currency);
      const outstanding = remainingOutstanding(purchase.grandTotal, allocatedAmount);
      return {
        purchaseId: purchase.id,
        purchaseNumber: purchase.number,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        status: purchase.status,
        issuedOn: purchase.issuedOn,
        dueOn: purchase.dueOn,
        grandTotal: purchase.grandTotal,
        allocated: allocatedAmount,
        outstanding,
      };
    })
    .filter((row) => row.outstanding.amountMinor > 0n)
    .sort((a, b) => a.issuedOn.localeCompare(b.issuedOn));

  for (const row of rows) {
    totalOutstanding = addMoney(totalOutstanding, row.outstanding);
  }

  return {
    asOf: todayInTimezone(input.timezone),
    totalOutstanding,
    rowCount: rows.length,
    rows,
  };
}

export async function getInventoryReport(
  input: Pick<
    BusinessReportDeps,
    "tenantId" | "timezone" | "catalog" | "inventory" | "lowStockThresholdMajor"
  >
): Promise<InventoryReport> {
  const threshold = parseLowStockThreshold(input.lowStockThresholdMajor);
  const positions = await listStockPositions({
    tenantId: input.tenantId,
    catalog: input.catalog,
    inventory: input.inventory,
    lowStockThreshold: threshold,
  });

  return {
    asOf: todayInTimezone(input.timezone),
    positionCount: positions.length,
    lowStockCount: positions.filter((p) => p.isLowStock).length,
    rows: positions.map((position) => ({
      productId: position.productId,
      name: position.productName,
      sku: position.sku || null,
      quantityMajor: position.quantity ? formatQuantity(position.quantity) : "0",
      isLowStock: position.isLowStock,
    })),
  };
}
