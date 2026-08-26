import { describe, expect, it } from "vitest";

import { authorizeCronRequest } from "@/lib/auth/cron-auth";
import { isPublicPath } from "@/lib/auth/public-routes";

describe("outbox cron auth", () => {
  it("exposes /api/internal/outbox/process as a public path", () => {
    expect(isPublicPath("/api/internal/outbox/process")).toBe(true);
  });

  it("rejects missing or wrong Bearer token when CRON_SECRET is set", () => {
    const secret = "test-cron-secret";

    expect(
      authorizeCronRequest(new Request("http://localhost/api/internal/outbox/process"), {
        cronSecret: secret,
        nodeEnv: "production",
      })?.status
    ).toBe(401);

    expect(
      authorizeCronRequest(
        new Request("http://localhost/api/internal/outbox/process", {
          headers: { Authorization: "Bearer wrong" },
        }),
        { cronSecret: secret, nodeEnv: "production" }
      )?.status
    ).toBe(401);
  });

  it("allows matching Bearer token", () => {
    const secret = "test-cron-secret";
    expect(
      authorizeCronRequest(
        new Request("http://localhost/api/internal/outbox/process", {
          headers: { Authorization: `Bearer ${secret}` },
        }),
        { cronSecret: secret, nodeEnv: "production" }
      )
    ).toBeNull();
  });

  it("fails closed in production when CRON_SECRET is missing", () => {
    expect(
      authorizeCronRequest(new Request("http://localhost/api/internal/outbox/process"), {
        cronSecret: undefined,
        nodeEnv: "production",
      })?.status
    ).toBe(503);
  });

  it("allows unauthenticated requests in development when secret is unset", () => {
    expect(
      authorizeCronRequest(new Request("http://localhost/api/internal/outbox/process"), {
        cronSecret: undefined,
        nodeEnv: "development",
      })
    ).toBeNull();
  });
});
