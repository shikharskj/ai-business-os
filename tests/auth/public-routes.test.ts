import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/lib/auth/public-routes";

describe("isPublicPath", () => {
  it("allows the marketing home and Clerk auth routes", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-in/sso-callback")).toBe(true);
    expect(isPublicPath("/sign-up")).toBe(true);
    expect(isPublicPath("/sign-up/verify-email-address")).toBe(true);
    expect(isPublicPath("/api/webhooks/clerk")).toBe(true);
    expect(isPublicPath("/__clerk/v1/client")).toBe(true);
  });

  it("protects application pages and server resources", () => {
    expect(isPublicPath("/app")).toBe(false);
    expect(isPublicPath("/api/me")).toBe(false);
    expect(isPublicPath("/api/webhooks")).toBe(false);
    expect(isPublicPath("/dashboard")).toBe(false);
  });

  it("allows the internal outbox cron path without a Clerk session", () => {
    expect(isPublicPath("/api/internal/outbox/process")).toBe(true);
  });
});
