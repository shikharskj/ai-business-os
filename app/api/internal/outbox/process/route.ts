import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/auth/cron-auth";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { createPrismaBusinessStateConsumerDeps } from "@/modules/business-state/infrastructure/prisma-consumer-deps";
import { runOutboxProcessing } from "@/modules/events/application/run-outbox-processing";
import { createPrismaOutboxDispatchRepository } from "@/modules/events/infrastructure/prisma-outbox-dispatch";
import { createPrismaAutomationRuntimeDeps } from "@/modules/workflows/infrastructure/prisma-runtime-deps";
import {
  createInAppChannel,
  createPrismaNotificationContextRepository,
  createPrismaNotificationRepository,
} from "@/modules/notifications";

/**
 * Background entrypoint for outbox consumer fan-out and overdue scans.
 * Public path (no Clerk session); authz = Bearer CRON_SECRET only.
 */
export async function POST(request: Request) {
  const unauthorized = authorizeCronRequest(request, {
    cronSecret: env.CRON_SECRET,
    nodeEnv: env.NODE_ENV,
  });
  if (unauthorized) {
    return unauthorized;
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
    businessState: createPrismaBusinessStateConsumerDeps(prisma),
    automation: createPrismaAutomationRuntimeDeps(prisma),
    overdueTenantIds,
    includeOverdueCheck: true,
    limit: 200,
  });

  return NextResponse.json(result);
}
