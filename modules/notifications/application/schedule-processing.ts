import { after } from "next/server";

import { prisma } from "@/lib/db/client";
import { createPrismaBusinessStateConsumerDeps } from "@/modules/business-state/infrastructure/prisma-consumer-deps";
import { runOutboxProcessing } from "@/modules/events/application/run-outbox-processing";
import { createPrismaOutboxDispatchRepository } from "@/modules/events/infrastructure/prisma-outbox-dispatch";
import { createInAppChannel } from "@/modules/notifications/infrastructure/in-app-channel";
import { createPrismaNotificationContextRepository } from "@/modules/notifications/infrastructure/prisma-notification-context";
import { createPrismaNotificationRepository } from "@/modules/notifications/infrastructure/prisma-notification-repository";
import { createPrismaAutomationRuntimeDeps } from "@/modules/workflows/infrastructure/prisma-runtime-deps";

/**
 * Fire-and-forget outbox fan-out after the HTTP/response path.
 * Uses Next.js `after()` so the original business transaction is
 * already committed and consumer failure cannot roll it back.
 */
export function scheduleNotificationOutboxProcessing(tenantId?: string): void {
  after(async () => {
    try {
      const notifications = createPrismaNotificationRepository(prisma);
      const context = createPrismaNotificationContextRepository(prisma);
      await runOutboxProcessing({
        tenantId,
        outbox: createPrismaOutboxDispatchRepository(prisma),
        context,
        channel: createInAppChannel(notifications),
        businessState: createPrismaBusinessStateConsumerDeps(prisma),
        automation: createPrismaAutomationRuntimeDeps(prisma),
        includeOverdueCheck: Boolean(tenantId),
      });
    } catch {
      // Non-critical: unreceipted outbox rows stay for the next pass.
    }
  });
}
