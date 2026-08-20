import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";
import type { DashboardDateRange } from "@/modules/reporting/domain/dashboard-range";

export type DashboardAlertKind = "OVERDUE_INVOICE" | "LOW_STOCK";

export type DashboardAlert = {
  kind: DashboardAlertKind;
  title: string;
  detail: string;
  href: string;
};

export type DashboardRecentInvoice = {
  id: string;
  number: string;
  customerName: string;
  issuedOn: BusinessDate;
  status: string;
  grandTotal: Money;
};

export type DashboardRecentExpense = {
  id: string;
  number: string;
  category: string;
  incurredOn: BusinessDate;
  grandTotal: Money;
};

export type DashboardSeriesPoint = {
  date: BusinessDate;
  sales: Money;
  expenses: Money;
};

export type DashboardOverview = {
  range: DashboardDateRange;
  revenue: Money;
  expenses: Money;
  profit: Money;
  receivables: Money;
  payables: Money;
  receiptsInPeriod: Money;
  paymentsOutInPeriod: Money;
  overdueInvoiceCount: number;
  overdueOutstanding: Money;
  lowStockCount: number;
  recentInvoices: DashboardRecentInvoice[];
  recentExpenses: DashboardRecentExpense[];
  series: DashboardSeriesPoint[];
  alerts: DashboardAlert[];
};
