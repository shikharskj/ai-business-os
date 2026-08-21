import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authorize, AuthorizationError } from "@/lib/security/authorize";
import {
  AttentionItemNotFoundError,
  attentionItemToDto,
  dismissAttentionItem,
  dismissAttentionSchema,
} from "@/modules/business-state";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

/**
 * Dismiss an attention item. Idempotent. Does not mutate invoices or stock.
 * Authz: report:read (authenticated member who can read the dashboard).
 */
export async function POST(request: Request) {
  try {
    const tenant = await authorize("report:read");
    const body = await request.json().catch(() => null);
    const parsed = dismissAttentionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid dismiss request." },
        { status: 400 }
      );
    }

    const result = await dismissAttentionItem({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      attentionItemId: parsed.data.attentionItemId,
      attention: createPrismaAttentionQueueRepository(prisma),
      audit: createPrismaAuditRepository(prisma),
      outbox: createPrismaOutboxRepository(prisma),
    });

    return NextResponse.json({
      dismissed: true,
      alreadyDismissed: result.alreadyDismissed,
      item: attentionItemToDto(result.item),
    });
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof AttentionItemNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}
