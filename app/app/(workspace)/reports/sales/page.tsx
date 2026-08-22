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
import { getSalesReport } from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function SalesReportPage({
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

  const report = await getSalesReport({
    tenantId: tenant.tenantId,
    range,
    sales: prismaSalesRepository,
  });

  const exportHref = `/api/reports/sales/export?range=custom&from=${encodeURIComponent(range.fromDate)}&to=${encodeURIComponent(range.toDate)}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Sales report"
        description="Posted sales invoices for the selected period. Totals use stored invoice amounts."
        actions={
          <Button nativeButton={false} variant="outline" render={<a href={exportHref} />}>
            Export CSV
          </Button>
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
        {report.invoiceCount} invoice{report.invoiceCount === 1 ? "" : "s"}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Taxable sales</p>
          <p className="mt-1 text-xl font-semibold">
            <MoneyDisplay value={report.totalTaxable} />
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Total tax</p>
          <p className="mt-1 text-xl font-semibold">
            <MoneyDisplay value={report.totalTax} />
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Grand total</p>
          <p className="mt-1 text-xl font-semibold">
            <MoneyDisplay value={report.grandTotal} />
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Taxable</TableHead>
            <TableHead className="text-right">Grand total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No posted sales in this period.
              </TableCell>
            </TableRow>
          ) : (
            report.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/app/sales/invoices/${row.id}`}
                    className="font-medium hover:underline"
                  >
                    {row.number}
                  </Link>
                </TableCell>
                <TableCell>{row.customerName}</TableCell>
                <TableCell className="font-mono text-sm">{row.issuedOn}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay value={row.taxableAmount} />
                </TableCell>
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
