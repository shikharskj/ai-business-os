import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authzErrorResponse } from "@/lib/http/auth-errors";
import { authorize } from "@/lib/security/authorize";
import {
  businessStateSummaryToDto,
  getBusinessStateSummary,
  rebuildBusinessStateProjections,
} from "@/modules/business-state";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";
import { createPrismaBusinessStateConsumerDeps } from "@/modules/business-state/infrastructure/prisma-consumer-deps";
import { createPrismaBusinessStateProjectionRepository } from "@/modules/business-state/infrastructure/prisma-projection-repository";

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
      expenses: deps.expenses,
      accounts: deps.accounts,
      journals: deps.journals,
      projections: deps.projections,
      attention: deps.attention,
      markRebuilt: true,
    });

    const summary = await getBusinessStateSummary({
      tenantId: tenant.tenantId,
      projections: createPrismaBusinessStateProjectionRepository(prisma),
      attention: createPrismaAttentionQueueRepository(prisma),
    });

    return NextResponse.json({
      rebuilt: true,
      state: businessStateSummaryToDto(summary),
    });
  } catch (error) {
    const authz = authzErrorResponse(error);
    if (authz) {
      return authz;
    }
    throw error;
  }
}
