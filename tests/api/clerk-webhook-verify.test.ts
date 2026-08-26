import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyWebhook = vi.fn();

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: (...args: unknown[]) => verifyWebhook(...args),
}));

vi.mock("@/lib/env", () => ({
  env: {
    CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test",
  },
}));

vi.mock("@/lib/auth/prisma-application-user-store", () => ({
  prismaApplicationUserStore: {},
}));

vi.mock("@/lib/auth/user-lifecycle", () => ({
  applyUserLifecycleEvent: vi.fn(),
  parseUserLifecycleEvent: vi.fn(() => null),
}));

vi.mock("@/modules/tenant/application/org-lifecycle", () => ({
  applyTenantLifecycleEvent: vi.fn(),
}));

vi.mock("@/modules/tenant/infrastructure/prisma-repositories", () => ({
  prismaBusinessRepository: {},
  prismaMembershipRepository: {},
}));

vi.mock("@/modules/tenant/schemas/org-lifecycle.schema", () => ({
  parseTenantLifecycleEvent: vi.fn(() => null),
}));

describe("POST /api/webhooks/clerk verification", () => {
  beforeEach(() => {
    verifyWebhook.mockReset();
  });

  it("returns 400 when webhook signature verification fails", async () => {
    verifyWebhook.mockRejectedValue(new Error("bad signature"));
    const { POST } = await import("@/app/api/webhooks/clerk/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: "{}",
      }) as never
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Verification failed");
  });
});
