import Link from "next/link";

import { MoneyDisplay } from "@/components/business/money-display";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authorize } from "@/lib/security";
import { periodKeyFromDate } from "@/modules/accounting";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { getGstSummary, gstSummarySearchSchema } from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

function documentKindLabel(kind: string): string {
  if (kind === "SALES_INVOICE") return "Sales invoice";
  if (kind === "PURCHASE") return "Purchase";
  if (kind === "EXPENSE") return "Expense";
  return kind;
}

export default async function GstSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] | undefined }>;
}) {
  const tenant = await authorize("report:read");
  const params = await searchParams;
  const currentPeriod = periodKeyFromDate(todayInTimezone(tenant.business.timezone));

  const periodValue = Array.isArray(params.period) ? params.period[0] : params.period;
  const parseResult = periodValue
    ? gstSummarySearchSchema.shape.period.safeParse(periodValue)
    : { success: true as const, data: currentPeriod };

  const period = parseResult.success ? parseResult.data : currentPeriod;
  const validationError = !parseResult.success
    ? "Invalid period format (expected YYYY-MM)"
    : null;

  const summary = await getGstSummary({
    tenantId: tenant.tenantId,
    periodKey: period,
    sales: prismaSalesRepository,
    purchases: prismaPurchasesRepository,
    expenses: prismaExpenseRepository,
  });

  const exportHref = `/api/reports/gst/export?period=${encodeURIComponent(period)}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="GST summary"
        description="Period totals from stored CGST / SGST / IGST on posted sales, purchases, and taxed expenses. Not a filing export."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/reports" />}
            >
              Back
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<a href={exportHref} />}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {validationError ? (
        <div
          id="period-error"
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 p-3 text-base text-destructive"
        >
          {validationError}
        </div>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="period" className="text-base font-medium">
            Period
          </label>
          <Input
            id="period"
            name="period"
            defaultValue={period}
            placeholder="YYYY-MM"
            aria-describedby={validationError ? "period-error" : undefined}
            aria-invalid={validationError ? true : undefined}
          />
        </div>
        <Button type="submit" variant="outline">
          Show
        </Button>
      </form>

      <p className="text-base text-muted-foreground">
        Period <span className="font-mono font-medium text-foreground">{summary.periodKey}</span>
        {" · "}
        {summary.fromDate} to {summary.toDate}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Output taxable</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            <MoneyDisplay value={summary.output.taxableAmount} />
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Output tax</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            <MoneyDisplay value={summary.output.totalTax} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            CGST <MoneyDisplay value={summary.output.cgst} />
            {" · "}
            SGST <MoneyDisplay value={summary.output.sgst} />
            {" · "}
            IGST <MoneyDisplay value={summary.output.igst} />
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Input taxable</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            <MoneyDisplay value={summary.input.taxableAmount} />
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Input tax</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            <MoneyDisplay value={summary.input.totalTax} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Net <MoneyDisplay value={summary.netTax} /> (output − input)
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Flow</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead className="text-right">Total tax</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  No GST-relevant posted documents in this period.
                </TableCell>
              </TableRow>
            ) : (
              summary.rows.map((row) => (
                <TableRow key={`${row.documentKind}-${row.documentId}`}>
                  <TableCell className="font-mono text-sm">{row.businessDate}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {documentKindLabel(row.documentKind)}
                    </span>
                    <span className="ml-2 font-mono text-sm">{row.documentNumber}</span>
                  </TableCell>
                  <TableCell>{row.partyName ?? "—"}</TableCell>
                  <TableCell>{row.taxFlow === "OUTPUT" ? "Output" : "Input"}</TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={row.taxableAmount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={row.cgst} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={row.sgst} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={row.igst} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={row.totalTax} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
