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

    // Catch up on this tenant's outbox before listing (idempotent).
    await processOutboxNotifications({
      tenantId: tenant.tenantId,
      outbox: createPrismaOutboxConsumerRepository(prisma),
      notifications,
      context: createPrismaNotificationContextRepository(prisma),
      channel: createInAppChannel(notifications),
      includeOverdueCheck: true,
    });

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
