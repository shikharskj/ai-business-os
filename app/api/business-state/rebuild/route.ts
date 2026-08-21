import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authorize, AuthorizationError } from "@/lib/security/authorize";
import {
  businessStateSummaryToDto,
  getBusinessStateSummary,
  rebuildBusinessStateProjections,
} from "@/modules/business-state";
import { createPrismaBusinessStateConsumerDeps } from "@/modules/business-state/infrastructure/prisma-consumer-deps";
import { createPrismaBusinessStateProjectionRepository } from "@/modules/business-state/infrastructure/prisma-projection-repository";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

/**
 * Rebuild BusinessState projections for the current tenant from domain truth.
 * Authz: report:read (same as reading reports — owner/admin/accountant).
 */
export async function POST() {
  try {
    const tenant = await authorize("report:read");
    const deps = createPrismaBusinessStateConsumerDeps(prisma);
    const context = await deps.resolveTenantContext(tenant.tenantId);
    if (!context) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    await rebuildBusinessStateProjections({
      tenantId: tenant.tenantId,
      timezone: context.timezone,
      lowStockThresholdMajor: context.lowStockThresholdMajor,
      currency: context.currency,
      sales: deps.sales,
      payments: deps.payments,
      catalog: deps.catalog,
      inventory: deps.inventory,
      projections: deps.projections,
      markRebuilt: true,
    });

    const summary = await getBusinessStateSummary({
      tenantId: tenant.tenantId,
      projections: createPrismaBusinessStateProjectionRepository(prisma),
    });

    return NextResponse.json({
      rebuilt: true,
      state: businessStateSummaryToDto(summary),
    });
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
