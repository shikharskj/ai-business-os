import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

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
    const expected = `Bearer ${configured}`;

    // Use timing-safe comparison to prevent timing attacks
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

  // Accept explicit tenant batch from request body to page through tenants,
  // or use a bounded default sample to prevent unbounded work
  let overdueTenantIds: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body.tenantIds)) {
      overdueTenantIds = body.tenantIds;
    }
  } catch {
    // No body or invalid JSON, fall back to bounded default
  }

  // If no explicit batch provided, fetch a bounded page of tenant IDs
  if (overdueTenantIds.length === 0) {
    const allTenantIds = await context.listAllTenantIds();
    overdueTenantIds = allTenantIds.slice(0, 50); // Bounded to 50 tenants per cron invocation
  }

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
