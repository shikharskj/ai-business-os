import Link from "next/link";

import { MoneyDisplay } from "@/components/business/money-display";
import { ReportDateRangeForm } from "@/components/business/report-date-range-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireReportTenant, resolveReportRange } from "@/lib/reports/report-range";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { getExpenseReport } from "@/modules/reporting";

export default async function ExpensesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const tenant = await requireReportTenant();
  const params = await searchParams;
  const { range, error } = await resolveReportRange({
    timezone: tenant.business.timezone,
    ...params,
  });

  const report = await getExpenseReport({
    tenantId: tenant.tenantId,
    range,
    expenses: prismaExpenseRepository,
  });

  const exportHref = `/api/reports/expenses/export?range=custom&from=${encodeURIComponent(range.fromDate)}&to=${encodeURIComponent(range.toDate)}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Expense report"
        description="Expenses for the selected period from recorded expense documents."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} variant="outline" render={<Link href="/app/reports" />}>
              Back
            </Button>
            <Button nativeButton={false} variant="outline" render={<a href={exportHref} />}>
              Export CSV
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-base text-destructive">
          {error}
        </div>
      ) : null}

      <ReportDateRangeForm from={range.fromDate} to={range.toDate} />

      <p className="text-base text-muted-foreground">
        {report.range.label}
        {" · "}
        <span className="font-mono text-foreground">
          {report.range.fromDate} – {report.range.toDate}
        </span>
        {" · "}
        {report.expenseCount} expense{report.expenseCount === 1 ? "" : "s"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Total expenses</p>
          <p className="mt-1 text-xl font-semibold">
            <MoneyDisplay value={report.total} />
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Total tax</p>
          <p className="mt-1 text-xl font-semibold">
            <MoneyDisplay value={report.totalTax} />
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Expense</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                No expenses in this period.
              </TableCell>
            </TableRow>
          ) : (
            report.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/app/expenses/${row.id}`}
                    className="font-medium hover:underline"
                  >
                    {row.number}
                  </Link>
                </TableCell>
                <TableCell>{row.categoryLabel}</TableCell>
                <TableCell className="font-mono text-sm">{row.incurredOn}</TableCell>
                <TableCell>{row.method}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay value={row.grandTotal} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
