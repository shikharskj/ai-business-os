import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { runOutboxProcessing } from "@/modules/events/application/run-outbox-processing";
import { createPrismaOutboxDispatchRepository } from "@/modules/events/infrastructure/prisma-outbox-dispatch";
import {
  createInAppChannel,
  createPrismaNotificationContextRepository,
  createPrismaNotificationRepository,
} from "@/modules/notifications";

/**
 * Background entrypoint for outbox consumer fan-out and overdue scans.
 * Protect with CRON_SECRET when configured; otherwise allow in development only.
 */
export async function POST(request: Request) {
  const configured = env.CRON_SECRET;
  if (configured) {
    const header = request.headers.get("authorization");
    const expected = `Bearer ${configured}`;

    if (!header || header.length !== expected.length) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const headerBuf = Buffer.from(header);
    const expectedBuf = Buffer.from(expected);

    if (!timingSafeEqual(headerBuf, expectedBuf)) {
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

  let overdueTenantIds: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body.tenantIds)) {
      overdueTenantIds = body.tenantIds
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 50);
    }
  } catch {
    // No body or invalid JSON
  }

  if (overdueTenantIds.length === 0) {
    const allTenantIds = await context.listAllTenantIds();
    overdueTenantIds = allTenantIds.slice(0, 50);
  }

  const result = await runOutboxProcessing({
    outbox: createPrismaOutboxDispatchRepository(prisma),
    context,
    channel: createInAppChannel(notifications),
    overdueTenantIds,
    includeOverdueCheck: true,
    limit: 200,
  });

  return NextResponse.json(result);
}
