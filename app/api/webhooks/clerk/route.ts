import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { prismaApplicationUserStore } from "@/lib/auth/prisma-application-user-store";
import {
  applyUserLifecycleEvent,
  parseUserLifecycleEvent,
} from "@/lib/auth/user-lifecycle";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(req, {
      signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch {
    return new Response("Verification failed", { status: 400 });
  }

  let lifecycleEvent;

  try {
    lifecycleEvent = parseUserLifecycleEvent(event);
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response("Invalid payload", { status: 400 });
    }

    throw error;
  }

  if (!lifecycleEvent) {
    return new Response("OK", { status: 200 });
  }

  await applyUserLifecycleEvent(prismaApplicationUserStore, lifecycleEvent);

  return new Response("OK", { status: 200 });
}
