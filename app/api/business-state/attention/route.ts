import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authorize, AuthorizationError } from "@/lib/security/authorize";
import {
  attentionItemToDto,
  listOpenAttention,
} from "@/modules/business-state";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

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
    if (error instanceof TenantRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
