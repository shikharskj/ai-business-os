import Link from "next/link";

import { MoneyDisplay } from "@/components/business/money-display";
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
import { requireReportTenant } from "@/lib/reports/report-range";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { getReceivablesReport } from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function ReceivablesReportPage() {
  const tenant = await requireReportTenant();
  const report = await getReceivablesReport({
    tenantId: tenant.tenantId,
    timezone: tenant.business.timezone,
    currency: tenant.business.currency,
    sales: prismaSalesRepository,
    payments: prismaPaymentRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Receivables report"
        description="Open customer balances from unpaid and partially paid invoices after payment allocations."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<a href="/api/reports/receivables/export" />}
          >
            Export CSV
          </Button>
        }
      />

      <p className="text-base text-muted-foreground">
        As of{" "}
        <span className="font-mono text-foreground">{report.asOf}</span>
        {" · "}
        {report.rowCount} open invoice{report.rowCount === 1 ? "" : "s"}
      </p>

      <div className="rounded-md border border-border p-4 sm:w-72">
        <p className="text-sm text-muted-foreground">Total outstanding</p>
        <p className="mt-1 text-xl font-semibold">
          <MoneyDisplay value={report.totalOutstanding} />
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No open receivables.
              </TableCell>
            </TableRow>
          ) : (
            report.rows.map((row) => (
              <TableRow key={row.invoiceId}>
                <TableCell>
                  <Link
                    href={`/app/sales/invoices/${row.invoiceId}`}
                    className="font-medium hover:underline"
                  >
                    {row.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>{row.customerName}</TableCell>
                <TableCell className="font-mono text-sm">{row.issuedOn}</TableCell>
                <TableCell className="font-mono text-sm">{row.dueOn ?? "—"}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay value={row.outstanding} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
