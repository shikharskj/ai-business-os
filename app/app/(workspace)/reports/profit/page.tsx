import { MoneyDisplay } from "@/components/business/money-display";
import { ReportDateRangeForm } from "@/components/business/report-date-range-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { requireReportTenant, resolveReportRange } from "@/lib/reports/report-range";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { getProfitReport } from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function ProfitReportPage({
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

  const report = await getProfitReport({
    tenantId: tenant.tenantId,
    range,
    sales: prismaSalesRepository,
    expenses: prismaExpenseRepository,
  });

  const exportHref = `/api/reports/profit/export?range=custom&from=${encodeURIComponent(range.fromDate)}&to=${encodeURIComponent(range.toDate)}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Profit summary"
        description="Sales taxable amount minus expenses for the period. Same basis as the dashboard profit KPI."
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
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Sales (taxable)</p>
          <p className="mt-1 text-xl font-semibold">
            <MoneyDisplay value={report.sales} />
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="mt-1 text-xl font-semibold">
            <MoneyDisplay value={report.expenses} />
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Profit</p>
          <p className="mt-1 text-xl font-semibold">
            <MoneyDisplay value={report.profit} />
          </p>
        </div>
      </div>
    </div>
  );
}
