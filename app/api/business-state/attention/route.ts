import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authzErrorResponse } from "@/lib/http/auth-errors";
import { authorize } from "@/lib/security/authorize";
import {
  attentionItemToDto,
  listOpenAttention,
} from "@/modules/business-state";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";

/**
 * List open AttentionQueue items for the current tenant, ranked by severity.
 * Authz: report:read (same as dashboard / BusinessState reads).
 */
export async function GET() {
  try {
    const tenant = await authorize("report:read");
    const items = await listOpenAttention({
      tenantId: tenant.tenantId,
      attention: createPrismaAttentionQueueRepository(prisma),
    });
    return NextResponse.json({
      items: items.map(attentionItemToDto),
    });
  } catch (error) {
    const authz = authzErrorResponse(error);
    if (authz) {
      return authz;
    }
    throw error;
  }
}
