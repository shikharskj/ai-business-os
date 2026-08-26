import { NextResponse } from "next/server";

import { authzErrorResponse } from "@/lib/http/auth-errors";
import { authorize } from "@/lib/security/authorize";
import { resolveAiActionSecret } from "@/modules/ai/infrastructure/action-secret";
import {
  AttentionItemNotFoundError,
  AttentionTenantMismatchError,
  prismaAttentionQueueRepository,
  proposeBriefPaymentReminder,
  proposeBriefReminderSchema,
} from "@/modules/business-state";

/**
 * Propose a payment reminder from a Daily Brief overdue row.
 * Returns a signed pending action; execution still requires
 * POST /api/assistant/actions/confirm.
 * Authz: invoice:update (same as send_payment_reminders).
 */
export async function POST(request: Request) {
  try {
    const tenant = await authorize("invoice:update");
    const body = await request.json().catch(() => null);
    const parsed = proposeBriefReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid propose request." },
        { status: 400 }
      );
    }

    const pending = await proposeBriefPaymentReminder({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      attentionItemId: parsed.data.attentionItemId,
      secret: resolveAiActionSecret(),
      attention: prismaAttentionQueueRepository,
    });

    return NextResponse.json(
      { pendingAction: pending },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    const authz = authzErrorResponse(error);
    if (authz) {
      return authz;
    }
    if (
      error instanceof AttentionItemNotFoundError ||
      error instanceof AttentionTenantMismatchError
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}
