import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import {
  createInAppChannel,
  createPrismaNotificationContextRepository,
  createPrismaNotificationRepository,
  createPrismaOutboxConsumerRepository,
  listNotifications,
  processOutboxNotifications,
} from "@/modules/notifications";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

export async function GET() {
  try {
    const tenant = await requireCurrentTenant();
    const notifications = createPrismaNotificationRepository(prisma);

    // Best-effort catch-up: isolate processing failures from the read path.
    // Per-request catch-up is gated to avoid excessive writes and scans.
    // The internal outbox processing route handles steady-state work.
    try {
      await processOutboxNotifications({
        tenantId: tenant.tenantId,
        outbox: createPrismaOutboxConsumerRepository(prisma),
        notifications,
        context: createPrismaNotificationContextRepository(prisma),
        channel: createInAppChannel(notifications),
        includeOverdueCheck: false, // Gate overdue check to reduce per-request work
        limit: 10, // Limit catch-up batch size to reduce per-request latency
      });
    } catch (processingError) {
      // Log but do not fail the request if outbox processing fails
      console.error("Outbox processing failed during notification fetch:", processingError);
    }

    const result = await listNotifications({
      tenantId: tenant.tenantId,
      notifications,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
