import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authzErrorResponse } from "@/lib/http/auth-errors";
import { authorize } from "@/lib/security/authorize";
import {
  AttentionItemNotFoundError,
  AttentionTenantMismatchError,
  attentionItemToDto,
  dismissAttentionItem,
  dismissAttentionSchema,
} from "@/modules/business-state";

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
      prisma,
    });

    return NextResponse.json({
      dismissed: true,
      alreadyDismissed: result.alreadyDismissed,
      item: attentionItemToDto(result.item),
    });
  } catch (error) {
    const authz = authzErrorResponse(error);
    if (authz) {
      return authz;
    }
    if (error instanceof AttentionItemNotFoundError || error instanceof AttentionTenantMismatchError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}
