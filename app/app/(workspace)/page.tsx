import { appendFileSync } from "node:fs";
import { currentUser } from "@clerk/nextjs/server";

import { DashboardCanvas } from "@/components/business/dashboard-canvas";
import { ErrorState } from "@/components/shell/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { prisma } from "@/lib/db/client";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
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

// #region agent log
function debugLog(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}) {
  const body = {
    sessionId: "c6ad66",
    runId: "pre-fix",
    timestamp: Date.now(),
    ...payload,
  };
  try {
    appendFileSync(
      "/Users/shikharskj/Desktop/ai-business-os/.cursor/debug-c6ad66.log",
      `${JSON.stringify(body)}\n`
    );
  } catch {
    /* ignore debug log failures */
  }
  fetch("http://127.0.0.1:7538/ingest/a3d20045-9ab4-4203-87e9-b51ce28a6953", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "c6ad66",
    },
    body: JSON.stringify(body),
  }).catch(() => {});
}
// #endregion

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  let step = "start";
  try {
  const tenant = await authorize("report:read");
  step = "authorize";
  // #region agent log
  debugLog({
    hypothesisId: "D",
    location: "app/app/(workspace)/page.tsx:authorize",
    message: "authorize succeeded",
    data: {
      role: tenant.membership.role,
      timezone: tenant.business.timezone,
    },
  });
  // #endregion
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
        : "Invalid date filter. Showing last 7 days.";
    range = resolveDashboardDateRange({
      timezone: tenant.business.timezone,
      preset: "last_7_days",
    });
  }
  step = "range";

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

  step = "yesterday";
  const yesterday = yesterdayInTimezone(tenant.business.timezone);
  const businessStateDeps = createPrismaBusinessStateConsumerDeps(prisma);

  step = "parallel";
  const [result, yesterdayActivity, items, clerkUser] = await Promise.all([
    runDashboardSupervisor({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      intent: { kind: "overview", range, tab: "overview" },
      deps,
    }).catch((error: unknown) => {
      step = "supervisor";
      throw error;
    }),
    getPeriodActivity({
      tenantId: tenant.tenantId,
      fromDate: yesterday,
      toDate: yesterday,
      sales: prismaSalesRepository,
      payments: prismaPaymentRepository,
      expenses: prismaExpenseRepository,
    }).catch((error: unknown) => {
      step = "periodActivity";
      throw error;
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
        expenses: businessStateDeps.expenses,
        accounts: businessStateDeps.accounts,
        journals: businessStateDeps.journals,
        projections: businessStateDeps.projections,
        attention: businessStateDeps.attention,
      });
      return listOpenAttention({
        tenantId: tenant.tenantId,
        attention: businessStateDeps.attention,
      });
    })().catch((error: unknown) => {
      step = "attention";
      throw error;
    }),
    (async () => {
      try {
        return await currentUser();
      } catch (error: unknown) {
        step = "currentUser";
        // #region agent log
        debugLog({
          hypothesisId: "G",
          location: "app/app/(workspace)/page.tsx:currentUser",
          message: "currentUser failed; continuing without greeting name",
          data: {
            name: error instanceof Error ? error.name : "unknown",
            errMessage:
              error instanceof Error ? error.message : String(error),
          },
        });
        // #endregion
        return null;
      }
    })(),
  ]);
  step = "parallel-ok";
  // #region agent log
  debugLog({
    hypothesisId: "A-C",
    location: "app/app/(workspace)/page.tsx:parallel",
    message: "dashboard parallel loads succeeded",
    data: {
      viewSource: result.view?.source ?? null,
      itemCount: items.length,
      hasOverview: Boolean(result.overview),
    },
  });
  // #endregion

  const recipientName =
    clerkUser?.firstName?.trim() ||
    clerkUser?.fullName?.trim() ||
    null;

  step = "brief";
  const brief = buildDailyBriefView({
    timezone: tenant.business.timezone,
    quiet: result.view.source === "fallback",
    recipientName,
    yesterday,
    sales: yesterdayActivity.sales,
    collections: yesterdayActivity.collections,
    expenses: yesterdayActivity.expenses,
    items,
    canPreparePaymentReminder: roleHasPermission(
      tenant.membership.role,
      "invoice:update"
    ),
    canPreparePurchase: roleHasPermission(
      tenant.membership.role,
      "purchase:create"
    ),
    overview: result.overview,
  });
  step = "render";
  // #region agent log
  debugLog({
    hypothesisId: "E",
    location: "app/app/(workspace)/page.tsx:brief",
    message: "brief built, rendering canvas",
    data: {
      briefItemCount: brief.items.length,
      greeting: Boolean(brief.greeting),
    },
  });
  // #endregion

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
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : String(error);
    // #region agent log
    console.error("[dashboard]", step, error);
    debugLog({
      hypothesisId: "F-H",
      location: "app/app/(workspace)/page.tsx:catch",
      message: "dashboard page threw",
      data: {
        step,
        name: error instanceof Error ? error.name : "unknown",
        errMessage,
        stack:
          error instanceof Error ? error.stack?.slice(0, 2000) ?? null : null,
      },
    });
    // #endregion
    return (
      <ErrorState
        title="Something went wrong"
        description={`${step}: ${errMessage.slice(0, 800)}`}
      />
    );
  }
}
