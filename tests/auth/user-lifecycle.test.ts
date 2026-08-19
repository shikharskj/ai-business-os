import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { createMemoryApplicationUserStore } from "@/lib/auth/application-user-store";
import {
  applyUserLifecycleEvent,
  parseUserLifecycleEvent,
} from "@/lib/auth/user-lifecycle";

describe("parseUserLifecycleEvent", () => {
  it("extracts the Clerk user id from user lifecycle events", () => {
    expect(
      parseUserLifecycleEvent({
        type: "user.created",
        data: { id: "user_123" },
      })
    ).toEqual({ type: "user.created", clerkUserId: "user_123" });
  });

  it("ignores unrelated Clerk events", () => {
    expect(
      parseUserLifecycleEvent({
        type: "session.created",
        data: { id: "sess_123" },
      })
    ).toBeNull();
  });

  it("rejects user events without a Clerk user id", () => {
    expect(() =>
      parseUserLifecycleEvent({
        type: "user.deleted",
        data: { deleted: true },
      })
    ).toThrow(ZodError);
  });
});

describe("applyUserLifecycleEvent", () => {
  it("upserts users idempotently for created and updated events", async () => {
    const store = createMemoryApplicationUserStore();

    await applyUserLifecycleEvent(store, {
      type: "user.created",
      clerkUserId: "user_123",
    });
    const first = await store.upsertByClerkUserId("user_123");

    await applyUserLifecycleEvent(store, {
      type: "user.created",
      clerkUserId: "user_123",
    });
    await applyUserLifecycleEvent(store, {
      type: "user.updated",
      clerkUserId: "user_123",
    });
    const second = await store.upsertByClerkUserId("user_123");

    expect(second).toEqual(first);
  });

  it("deletes users idempotently", async () => {
    const store = createMemoryApplicationUserStore([
      { id: "app_1", clerkUserId: "user_123" },
    ]);

    await applyUserLifecycleEvent(store, {
      type: "user.deleted",
      clerkUserId: "user_123",
    });
    await applyUserLifecycleEvent(store, {
      type: "user.deleted",
      clerkUserId: "user_123",
    });

    const recreated = await store.upsertByClerkUserId("user_123");
    expect(recreated.id).not.toBe("app_1");
  });
});
