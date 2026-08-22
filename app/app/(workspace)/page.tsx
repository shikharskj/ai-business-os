import { currentUser } from "@clerk/nextjs/server";

import { DashboardCanvas } from "@/components/business/dashboard-canvas";
import { PageHeader } from "@/components/shell/page-header";
import { prisma } from "@/lib/db/client";
import { authorize } from "@/lib/security";
import { runDashboardSupervisor } from "@/modules/ai/server";
import {
  buildDailyBriefView,
  createPrismaBusinessStateConsumerDeps,
  ensureAttentionQueueFresh,
  listOpenAttention,
} from "@/modules/business-state";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { prismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import {
  getPeriodActivity,
  resolveDashboardDateRange,
  ReportingError,
} from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { yesterdayInTimezone } from "@/modules/shared-kernel/dates";

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

  const yesterday = yesterdayInTimezone(tenant.business.timezone);
  const businessStateDeps = createPrismaBusinessStateConsumerDeps(prisma);

  const [result, yesterdayActivity, items, clerkUser] = await Promise.all([
    runDashboardSupervisor({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      intent: { kind: "overview", range, tab: "overview" },
      deps,
    }),
    getPeriodActivity({
      tenantId: tenant.tenantId,
      fromDate: yesterday,
      toDate: yesterday,
      sales: prismaSalesRepository,
      payments: prismaPaymentRepository,
      expenses: prismaExpenseRepository,
    }),
    (async () => {
      await ensureAttentionQueueFresh({
        tenantId: tenant.tenantId,
        timezone: tenant.business.timezone,
        lowStockThresholdMajor: tenant.business.lowStockThreshold,
        currency: tenant.business.currency,
        sales: businessStateDeps.sales,
        payments: businessStateDeps.payments,
        catalog: businessStateDeps.catalog,
        inventory: businessStateDeps.inventory,
        accounts: businessStateDeps.accounts,
        journals: businessStateDeps.journals,
        projections: businessStateDeps.projections,
        attention: businessStateDeps.attention,
      });
      return listOpenAttention({
        tenantId: tenant.tenantId,
        attention: businessStateDeps.attention,
      });
    })(),
    currentUser(),
  ]);

  const recipientName =
    clerkUser?.firstName?.trim() ||
    clerkUser?.fullName?.trim() ||
    null;

  const brief = buildDailyBriefView({
    timezone: tenant.business.timezone,
    quiet: result.view.source === "fallback",
    recipientName,
    yesterday,
    sales: yesterdayActivity.sales,
    collections: yesterdayActivity.collections,
    expenses: yesterdayActivity.expenses,
    items,
    overview: result.overview,
  });

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Overview of ${tenant.business.name}`}
        descriptionEnd={
          <div className="flex flex-col gap-1 text-base text-muted-foreground">
            <p className="leading-snug">
              <span className="font-medium text-foreground">
                {result.view.period.label}
              </span>
              <span className="mx-1.5 text-border">·</span>
              <span className="font-mono text-foreground/80">
                {result.view.period.from} – {result.view.period.to}
              </span>
              <span className="mx-1.5 text-border">·</span>
              <span>{tenant.business.timezone}</span>
            </p>
            {result.view.source === "fallback" ? (
              <p className="text-sm text-muted-foreground">
                Showing deterministic overview (AI supervisor unavailable or
                degraded).
              </p>
            ) : null}
          </div>
        }
      />

      {rangeError ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-base text-destructive">
          {rangeError}
        </div>
      ) : null}

      <DashboardCanvas
        view={result.view}
        chartRangePreset={range.preset}
        brief={brief}
      />
    </div>
  );
}
