import "server-only";

import { AiConfigError } from "@/lib/ai/types";
import { env } from "@/lib/env";

/**
 * Key used to sign AI action confirmations.
 *
 * Falls back to the Clerk secret so no new deployment variable is required:
 * confirming an action already implies an authenticated Clerk session, so if
 * this is missing the request could not have got here anyway.
 */
export function resolveAiActionSecret(): string {
  const secret = env.AI_ACTION_SIGNING_SECRET ?? env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new AiConfigError(
      "AI_ACTION_SIGNING_SECRET or CLERK_SECRET_KEY is required to confirm AI actions."
    );
  }
  return secret;
}
