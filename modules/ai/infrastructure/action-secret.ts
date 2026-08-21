import "server-only";

import { createHmac } from "node:crypto";

import { AiConfigError } from "@/lib/ai/types";
import { env } from "@/lib/env";

/** Domain separation so the Clerk secret is never reused raw as an HMAC key. */
const ACTION_SIGNING_DOMAIN = "ai-business-os:ai-action-signing:v1";

/**
 * Key used to sign AI action confirmations.
 *
 * Prefer `AI_ACTION_SIGNING_SECRET`. When unset, derive a dedicated key from
 * `CLERK_SECRET_KEY` via HMAC (project crypto primitive) rather than signing
 * with the Clerk secret itself.
 */
export function resolveAiActionSecret(): string {
  if (env.AI_ACTION_SIGNING_SECRET) {
    return env.AI_ACTION_SIGNING_SECRET;
  }

  const clerkSecret = env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    throw new AiConfigError(
      "AI_ACTION_SIGNING_SECRET or CLERK_SECRET_KEY is required to confirm AI actions."
    );
  }

  return createHmac("sha256", clerkSecret)
    .update(ACTION_SIGNING_DOMAIN)
    .digest("base64url");
}
