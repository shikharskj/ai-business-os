import { z } from "zod";

import type { ApplicationUserStore } from "@/lib/auth/application-user-store";

const clerkUserIdSchema = z
  .string()
  .min(1, "Clerk user id is required")
  .refine((value) => !value.includes(" "), "Clerk user id must not contain spaces");

const userEventDataSchema = z.object({
  id: clerkUserIdSchema,
});

export type UserLifecycleEvent =
  | { type: "user.created"; clerkUserId: string }
  | { type: "user.updated"; clerkUserId: string }
  | { type: "user.deleted"; clerkUserId: string };

const USER_LIFECYCLE_TYPES = new Set([
  "user.created",
  "user.updated",
  "user.deleted",
]);

export function parseUserLifecycleEvent(input: {
  type: string;
  data: unknown;
}): UserLifecycleEvent | null {
  if (!USER_LIFECYCLE_TYPES.has(input.type)) {
    return null;
  }

  const data = userEventDataSchema.parse(input.data);

  return {
    type: input.type as UserLifecycleEvent["type"],
    clerkUserId: data.id,
  };
}

/**
 * Apply Clerk user lifecycle events.
 * For user.deleted: stores must revoke memberships and avoid hard-delete when
 * the user owns a Business or other Restrict FKs (anonymize clerkUserId instead).
 * Failures are logged and swallowed so the webhook can return 200.
 */
export async function applyUserLifecycleEvent(
  store: ApplicationUserStore,
  event: UserLifecycleEvent
): Promise<void> {
  if (event.type === "user.deleted") {
    try {
      await store.deleteByClerkUserId(event.clerkUserId);
    } catch (error) {
      console.error("user.deleted: safe handling failed; acknowledging webhook", {
        clerkUserId: event.clerkUserId,
        error,
      });
    }
    return;
  }

  await store.upsertByClerkUserId(event.clerkUserId);
}
