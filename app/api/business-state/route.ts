import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authorize, AuthorizationError } from "@/lib/security/authorize";
import {
  businessStateSummaryToDto,
  getBusinessStateSummary,
} from "@/modules/business-state";
import { createPrismaBusinessStateProjectionRepository } from "@/modules/business-state/infrastructure/prisma-projection-repository";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

/**
 * Read BusinessState projections for the current tenant.
 * Authz: report:read. Does not invent money — returns derived snapshots only.
 */
export async function GET() {
  try {
    const tenant = await authorize("report:read");
    const projections = createPrismaBusinessStateProjectionRepository(prisma);
    const summary = await getBusinessStateSummary({
      tenantId: tenant.tenantId,
      projections,
    });
    return NextResponse.json(businessStateSummaryToDto(summary));
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
