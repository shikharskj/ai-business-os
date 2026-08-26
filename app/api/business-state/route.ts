import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authzErrorResponse } from "@/lib/http/auth-errors";
import { authorize } from "@/lib/security/authorize";
import {
  businessStateSummaryToDto,
  getBusinessStateSummary,
} from "@/modules/business-state";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";
import { createPrismaBusinessStateProjectionRepository } from "@/modules/business-state/infrastructure/prisma-projection-repository";

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
      attention: createPrismaAttentionQueueRepository(prisma),
    });
    return NextResponse.json(businessStateSummaryToDto(summary));
  } catch (error) {
    const authz = authzErrorResponse(error);
    if (authz) {
      return authz;
    }
    throw error;
  }
}
