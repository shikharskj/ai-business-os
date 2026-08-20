import {
  expenseReportToCsv,
  inventoryReportToCsv,
  payablesReportToCsv,
  profitReportToCsv,
  receivablesReportToCsv,
  salesReportToCsv,
} from "@/modules/reporting/domain/csv";
import {
  getExpenseReport,
  getInventoryReport,
  getPayablesReport,
  getProfitReport,
  getReceivablesReport,
  getSalesReport,
  type BusinessReportDeps,
} from "@/modules/reporting/application/business-reports";

export async function exportSalesCsv(
  input: Pick<BusinessReportDeps, "tenantId" | "range" | "sales">
) {
  const report = await getSalesReport(input);
  return {
    filename: `sales-report-${report.range.fromDate}-${report.range.toDate}.csv`,
    csv: salesReportToCsv(report),
    report,
  };
}

export async function exportExpenseCsv(
  input: Pick<BusinessReportDeps, "tenantId" | "range" | "expenses">
) {
  const report = await getExpenseReport(input);
  return {
    filename: `expense-report-${report.range.fromDate}-${report.range.toDate}.csv`,
    csv: expenseReportToCsv(report),
    report,
  };
}

export async function exportProfitCsv(
  input: Pick<BusinessReportDeps, "tenantId" | "range" | "sales" | "expenses">
) {
  const report = await getProfitReport(input);
  return {
    filename: `profit-report-${report.range.fromDate}-${report.range.toDate}.csv`,
    csv: profitReportToCsv(report),
    report,
  };
}

export async function exportReceivablesCsv(
  input: Pick<BusinessReportDeps, "tenantId" | "timezone" | "sales" | "payments">
) {
  const report = await getReceivablesReport(input);
  return {
    filename: `receivables-report-${report.asOf}.csv`,
    csv: receivablesReportToCsv(report),
    report,
  };
}

export async function exportPayablesCsv(
  input: Pick<
    BusinessReportDeps,
    "tenantId" | "timezone" | "purchases" | "supplierPayments"
  >
) {
  const report = await getPayablesReport(input);
  return {
    filename: `payables-report-${report.asOf}.csv`,
    csv: payablesReportToCsv(report),
    report,
  };
}

export async function exportInventoryCsv(
  input: Pick<
    BusinessReportDeps,
    "tenantId" | "timezone" | "catalog" | "inventory" | "lowStockThresholdMajor"
  >
) {
  const report = await getInventoryReport(input);
  return {
    filename: `inventory-report-${report.asOf}.csv`,
    csv: inventoryReportToCsv(report),
    report,
  };
}
