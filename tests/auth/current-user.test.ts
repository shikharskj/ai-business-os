import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryApplicationUserStore } from "@/lib/auth/application-user-store";
import { AuthenticationError } from "@/lib/auth/errors";

const authMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

describe("requireCurrentUser", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("fails closed when Clerk reports no authenticated session", async () => {
    authMock.mockResolvedValue({ isAuthenticated: false, userId: null });
    const { requireCurrentUser } = await import("@/lib/auth/current-user");

    await expect(
      requireCurrentUser(createMemoryApplicationUserStore())
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("maps the trusted Clerk user id to an application user", async () => {
    authMock.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_123",
    });
    const { requireCurrentUser } = await import("@/lib/auth/current-user");
    const store = createMemoryApplicationUserStore();

    const user = await requireCurrentUser(store);

    expect(user.clerkUserId).toBe("user_123");
    expect(user.id).toBeTruthy();
  });
});
