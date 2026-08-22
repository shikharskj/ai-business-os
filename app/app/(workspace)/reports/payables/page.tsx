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
import { prismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { getPayablesReport } from "@/modules/reporting";

export default async function PayablesReportPage() {
  const tenant = await requireReportTenant();
  const report = await getPayablesReport({
    tenantId: tenant.tenantId,
    timezone: tenant.business.timezone,
    purchases: prismaPurchasesRepository,
    supplierPayments: prismaSupplierPaymentRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Payables report"
        description="Open supplier balances from unpaid and partially paid bills after payment allocations."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<a href="/api/reports/payables/export" />}
          >
            Export CSV
          </Button>
        }
      />

      <p className="text-base text-muted-foreground">
        As of{" "}
        <span className="font-mono text-foreground">{report.asOf}</span>
        {" · "}
        {report.rowCount} open bill{report.rowCount === 1 ? "" : "s"}
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
            <TableHead>Bill</TableHead>
            <TableHead>Supplier</TableHead>
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
                No open payables.
              </TableCell>
            </TableRow>
          ) : (
            report.rows.map((row) => (
              <TableRow key={row.purchaseId}>
                <TableCell>
                  <Link
                    href={`/app/purchases/bills/${row.purchaseId}`}
                    className="font-medium hover:underline"
                  >
                    {row.purchaseNumber}
                  </Link>
                </TableCell>
                <TableCell>{row.supplierName}</TableCell>
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
