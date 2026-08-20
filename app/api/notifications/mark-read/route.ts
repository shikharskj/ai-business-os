import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import {
  createPrismaNotificationRepository,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsSchema,
  NotificationError,
} from "@/modules/notifications";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

export async function POST(request: Request) {
  try {
    const tenant = await requireCurrentTenant();
    const body = await request.json().catch(() => null);
    const parsed = markNotificationsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid mark-read request." },
        { status: 400 }
      );
    }

    const notifications = createPrismaNotificationRepository(prisma);

    if (parsed.data.markAll) {
      const count = await markAllNotificationsRead({
        tenantId: tenant.tenantId,
        notifications,
      });
      return NextResponse.json({ marked: count });
    }

    await markNotificationRead({
      tenantId: tenant.tenantId,
      notificationId: parsed.data.notificationId!,
      notifications,
    });
    return NextResponse.json({ marked: 1 });
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof NotificationError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
