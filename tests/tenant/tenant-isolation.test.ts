import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryBusinessRepository, createMemoryMembershipRepository } from "@/modules/tenant/infrastructure/repositories";
import { TenantAccessDeniedError } from "@/modules/tenant/domain/errors";

const authMock = vi.fn();
const verifyClerkOrganizationMembershipMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/clerk", () => ({
  getClerkUserId: vi.fn(async () => "user_owner"),
}));

vi.mock("@/lib/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({
    id: "app-user-1",
    clerkUserId: "user_owner",
  })),
}));

vi.mock("@/lib/tenant/clerk-gateways", () => ({
  verifyClerkOrganizationMembership: (...args: unknown[]) =>
    verifyClerkOrganizationMembershipMock(...args),
}));

describe("requireTenantForTrustedResource", () => {
  beforeEach(() => {
    authMock.mockReset();
    verifyClerkOrganizationMembershipMock.mockReset();
    verifyClerkOrganizationMembershipMock.mockResolvedValue(undefined);
  });

  it("rejects cross-tenant id tampering from the client", async () => {
    authMock.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_owner",
      orgId: "org_a",
    });

    const businessRepository = createMemoryBusinessRepository([
      {
        id: "tenant-a",
        clerkOrganizationId: "org_a",
        name: "Alpha Traders",
        type: "PROPRIETORSHIP",
        ownerUserId: "app-user-1",
        addressLine1: "1 Market Road",
        addressLine2: null,
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        country: "IN",
        phone: "9876543210",
        email: "alpha@example.com",
        gstRegistrationStatus: "REGISTERED",
        gstin: "27AABCU9603R1ZM",
        financialYearStartMonth: 4,
        timezone: "Asia/Kolkata",
        currency: "INR",
        defaultGstRateBps: 1800,
        lowStockThreshold: "5",
        closedThroughPeriodKey: null,
      },
    ]);
    const membershipRepository = createMemoryMembershipRepository([
      {
        id: "membership-1",
        userId: "app-user-1",
        tenantId: "tenant-a",
        role: "OWNER",
        status: "ACTIVE",
        clerkOrganizationMembershipId: "om_1",
      },
    ]);

    const { requireTenantForTrustedResource } = await import(
      "@/lib/tenant/current-tenant"
    );

    await expect(
      requireTenantForTrustedResource({
        tenantId: "tenant-b",
        deps: { businessRepository, membershipRepository },
      })
    ).rejects.toBeInstanceOf(TenantAccessDeniedError);
  });
});
