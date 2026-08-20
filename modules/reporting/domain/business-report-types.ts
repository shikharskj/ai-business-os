import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";

export type ReportDateRange = {
  fromDate: BusinessDate;
  toDate: BusinessDate;
  label: string;
};

export type SalesReportRow = {
  id: string;
  number: string;
  customerName: string;
  issuedOn: BusinessDate;
  status: string;
  taxableAmount: Money;
  totalTax: Money;
  grandTotal: Money;
};

export type SalesReport = {
  range: ReportDateRange;
  totalTaxable: Money;
  totalTax: Money;
  grandTotal: Money;
  invoiceCount: number;
  rows: SalesReportRow[];
};

export type ExpenseReportRow = {
  id: string;
  number: string;
  category: string;
  categoryLabel: string;
  incurredOn: BusinessDate;
  method: string;
  grandTotal: Money;
  totalTax: Money;
};

export type ExpenseReport = {
  range: ReportDateRange;
  total: Money;
  totalTax: Money;
  expenseCount: number;
  rows: ExpenseReportRow[];
};

export type ProfitReport = {
  range: ReportDateRange;
  sales: Money;
  expenses: Money;
  profit: Money;
};

export type ReceivablesReportRow = {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  status: string;
  issuedOn: BusinessDate;
  dueOn: BusinessDate | null;
  grandTotal: Money;
  allocated: Money;
  outstanding: Money;
};

export type ReceivablesReport = {
  asOf: BusinessDate;
  totalOutstanding: Money;
  rowCount: number;
  rows: ReceivablesReportRow[];
};

export type PayablesReportRow = {
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  status: string;
  issuedOn: BusinessDate;
  dueOn: BusinessDate | null;
  grandTotal: Money;
  allocated: Money;
  outstanding: Money;
};

export type PayablesReport = {
  asOf: BusinessDate;
  totalOutstanding: Money;
  rowCount: number;
  rows: PayablesReportRow[];
};

export type InventoryReportRow = {
  productId: string;
  name: string;
  sku: string | null;
  quantityMajor: string;
  isLowStock: boolean;
};

export type InventoryReport = {
  asOf: BusinessDate;
  positionCount: number;
  lowStockCount: number;
  rows: InventoryReportRow[];
};
