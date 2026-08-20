import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import {
  createInAppChannel,
  createPrismaNotificationContextRepository,
  createPrismaNotificationRepository,
  createPrismaOutboxConsumerRepository,
  processOutboxNotifications,
} from "@/modules/notifications";

/**
 * Background entrypoint for outbox → notification processing and overdue scans.
 * Protect with CRON_SECRET when configured; otherwise allow in development only.
 */
export async function POST(request: Request) {
  const configured = env.CRON_SECRET;
  if (configured) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${configured}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is required in production." },
      { status: 503 }
    );
  }

  const notifications = createPrismaNotificationRepository(prisma);
  const context = createPrismaNotificationContextRepository(prisma);
  const overdueTenantIds = await context.listAllTenantIds();

  const result = await processOutboxNotifications({
    outbox: createPrismaOutboxConsumerRepository(prisma),
    notifications,
    context,
    channel: createInAppChannel(notifications),
    overdueTenantIds,
    includeOverdueCheck: true,
    limit: 200,
  });

  return NextResponse.json(result);
}
