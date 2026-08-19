import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { prismaApplicationUserStore } from "@/lib/auth/prisma-application-user-store";
import {
  applyUserLifecycleEvent,
  parseUserLifecycleEvent,
} from "@/lib/auth/user-lifecycle";
import { env } from "@/lib/env";
import { applyTenantLifecycleEvent } from "@/modules/tenant/application/org-lifecycle";
import {
  prismaBusinessRepository,
  prismaMembershipRepository,
} from "@/modules/tenant/infrastructure/prisma-repositories";
import { parseTenantLifecycleEvent } from "@/modules/tenant/schemas/org-lifecycle.schema";

export async function POST(req: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(req, {
      signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch {
    return new Response("Verification failed", { status: 400 });
  }

  let userLifecycleEvent;

  try {
    userLifecycleEvent = parseUserLifecycleEvent(event);
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response("Invalid payload", { status: 400 });
    }

    throw error;
  }

  if (userLifecycleEvent) {
    await applyUserLifecycleEvent(prismaApplicationUserStore, userLifecycleEvent);
    return new Response("OK", { status: 200 });
  }

  let tenantLifecycleEvent;

  try {
    tenantLifecycleEvent = parseTenantLifecycleEvent(event);
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response("Invalid payload", { status: 400 });
    }

    throw error;
  }

  if (tenantLifecycleEvent) {
    await applyTenantLifecycleEvent(
      {
        userStore: prismaApplicationUserStore,
        businessRepository: prismaBusinessRepository,
        membershipRepository: prismaMembershipRepository,
      },
      tenantLifecycleEvent
    );
    return new Response("OK", { status: 200 });
  }

  return new Response("OK", { status: 200 });
}
