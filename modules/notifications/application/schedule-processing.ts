import { after } from "next/server";

import { prisma } from "@/lib/db/client";
import { processOutboxNotifications } from "@/modules/notifications/application/process-outbox";
import { createInAppChannel } from "@/modules/notifications/infrastructure/in-app-channel";
import { createPrismaNotificationContextRepository } from "@/modules/notifications/infrastructure/prisma-notification-context";
import { createPrismaNotificationRepository } from "@/modules/notifications/infrastructure/prisma-notification-repository";
import { createPrismaOutboxConsumerRepository } from "@/modules/notifications/infrastructure/prisma-outbox-consumer";

/**
 * Fire-and-forget outbox → notification processing after the HTTP/response
 * path. Uses Next.js `after()` so the original business transaction is
 * already committed and notification failure cannot roll it back.
 */
export function scheduleNotificationOutboxProcessing(tenantId?: string): void {
  after(async () => {
    try {
      const notifications = createPrismaNotificationRepository(prisma);
      await processOutboxNotifications({
        tenantId,
        outbox: createPrismaOutboxConsumerRepository(prisma),
        notifications,
        context: createPrismaNotificationContextRepository(prisma),
        channel: createInAppChannel(notifications),
        includeOverdueCheck: Boolean(tenantId),
      });
    } catch {
      // Non-critical: outbox rows stay unprocessed for the next pass.
    }
  });
}
