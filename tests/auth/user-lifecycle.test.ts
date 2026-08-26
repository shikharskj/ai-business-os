import { describe, expect, it, vi } from "vitest";
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
    const upsert = vi.spyOn(store, "upsertByClerkUserId");

    await applyUserLifecycleEvent(store, {
      type: "user.created",
      clerkUserId: "user_123",
    });

    await applyUserLifecycleEvent(store, {
      type: "user.created",
      clerkUserId: "user_123",
    });
    await applyUserLifecycleEvent(store, {
      type: "user.updated",
      clerkUserId: "user_123",
    });

    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert).toHaveBeenCalledWith("user_123");
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

  it("acknowledges user.deleted when store delete throws", async () => {
    const store = createMemoryApplicationUserStore();
    const error = new Error("FK restrict");
    vi.spyOn(store, "deleteByClerkUserId").mockRejectedValue(error);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      applyUserLifecycleEvent(store, {
        type: "user.deleted",
        clerkUserId: "user_blocked",
      })
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
