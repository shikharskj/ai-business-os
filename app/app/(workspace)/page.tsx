import { DashboardCanvas } from "@/components/business/dashboard-canvas";
import { PageHeader } from "@/components/shell/page-header";
import { authorize } from "@/lib/security";
import { runDashboardSupervisor } from "@/modules/ai/server";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { prismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { resolveDashboardDateRange, ReportingError } from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const tenant = await authorize("report:read");
  const params = await searchParams;

  let rangeError: string | null = null;
  let range;
  try {
    range = resolveDashboardDateRange({
      timezone: tenant.business.timezone,
      preset: params.range,
      from: params.from,
      to: params.to,
    });
  } catch (error) {
    rangeError =
      error instanceof ReportingError
        ? error.message
        : "Invalid date filter. Showing last 3 months.";
    range = resolveDashboardDateRange({
      timezone: tenant.business.timezone,
      preset: "last_3_months",
    });
  }

  const deps = {
    tenantId: tenant.tenantId,
    timezone: tenant.business.timezone,
    lowStockThresholdMajor: tenant.business.lowStockThreshold,
    range,
    sales: prismaSalesRepository,
    purchases: prismaPurchasesRepository,
    expenses: prismaExpenseRepository,
    payments: prismaPaymentRepository,
    supplierPayments: prismaSupplierPaymentRepository,
    catalog: prismaCatalogRepository,
    inventory: prismaInventoryRepository,
  };

  const result = await runDashboardSupervisor({
    tenantId: tenant.tenantId,
    actorUserId: tenant.membership.userId,
    intent: { kind: "overview", range, tab: "overview" },
    deps,
  });

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Overview of ${tenant.business.name}`}
      />

      {rangeError ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-base text-destructive">
          {rangeError}
        </div>
      ) : null}

      <div className="-mt-2 flex flex-col gap-1 border-b border-border/60 pb-4 text-sm text-muted-foreground">
        <p>
          <span>{result.view.period.label}</span>
          <span className="mx-1.5 text-border">·</span>
          <span className="font-mono text-xs text-foreground/80">
            {result.view.period.from} – {result.view.period.to}
          </span>
          <span className="mx-1.5 text-border">·</span>
          <span className="text-xs">{tenant.business.timezone}</span>
        </p>
        {result.view.source === "fallback" ? (
          <p className="text-xs text-muted-foreground">
            Showing deterministic overview (AI supervisor unavailable or
            degraded).
          </p>
        ) : null}
      </div>

      <DashboardCanvas view={result.view} chartRangePreset={range.preset} />
    </div>
  );
}
