import { describe, expect, it } from "vitest";

import { createBusinessWithOrganization } from "@/modules/tenant/application/business-setup";
import {
  createMemoryBusinessRepository,
  createMemoryMembershipRepository,
} from "@/modules/tenant/infrastructure/repositories";

describe("createBusinessWithOrganization", () => {
  it("persists GSTIN and financial year on the business profile", async () => {
    const businessRepository = createMemoryBusinessRepository();
    const membershipRepository = createMemoryMembershipRepository();
    const clerkCalls: string[] = [];

    const result = await createBusinessWithOrganization({
      owner: { id: "app-user-1", clerkUserId: "user_owner" },
      profile: {
        name: "Alpha Traders",
        type: "PROPRIETORSHIP",
        addressLine1: "1 Market Road",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        country: "IN",
        phone: "9876543210",
        email: "alpha@example.com",
        gstRegistrationStatus: "REGISTERED",
        gstin: "27aabCU9603r1zm",
        financialYearStartMonth: 4,
        timezone: "Asia/Kolkata",
        currency: "INR",
        defaultGstRateBps: 1800,
        lowStockThreshold: "5",
      },
      idempotencyKey: "alpha-key",
      businessRepository,
      membershipRepository,
      clerkOrganizationGateway: {
        async createOrganization() {
          clerkCalls.push("create");
          return { id: "org_alpha" };
        },
        async deleteOrganization() {
          clerkCalls.push("delete");
        },
        async getOrganizationMembership() {
          return { role: "org:admin" };
        },
        async listUserOrganizations() {
          return [];
        },
        async listOrganizationMemberships() {
          return [];
        },
        async listPendingInvitations() {
          return [];
        },
      },
    });

    expect(result.business.gstin).toBe("27AABCU9603R1ZM");
    expect(result.business.financialYearStartMonth).toBe(4);
    expect(result.business.clerkOrganizationId).toBe("org_alpha");
    expect(result.membership.role).toBe("OWNER");
    expect(clerkCalls).toEqual(["create"]);
  });

  it("keeps the Clerk organization when chart seeding fails so retry can complete", async () => {
    const businessRepository = createMemoryBusinessRepository();
    const membershipRepository = createMemoryMembershipRepository();
    const clerkCalls: string[] = [];
    const createdOrgs: { id: string; name: string }[] = [];
    let seedAttempts = 0;
    const profile = {
      name: "Alpha Traders",
      type: "PROPRIETORSHIP" as const,
      addressLine1: "1 Market Road",
      city: "Pune",
      state: "Maharashtra",
      postalCode: "411001",
      country: "IN",
      phone: "9876543210",
      email: "alpha@example.com",
      gstRegistrationStatus: "REGISTERED" as const,
      gstin: "27AABCU9603R1ZM",
      financialYearStartMonth: 4,
      timezone: "Asia/Kolkata",
      currency: "INR",
      defaultGstRateBps: 1800,
      lowStockThreshold: "5",
    };
    const gateway = {
      async createOrganization() {
        clerkCalls.push("create");
        const org = { id: "org_alpha", name: profile.name };
        createdOrgs.push(org);
        return org;
      },
      async deleteOrganization() {
        clerkCalls.push("delete");
      },
      async getOrganizationMembership() {
        return { role: "org:admin" };
      },
      async listUserOrganizations() {
        clerkCalls.push("list");
        return [...createdOrgs];
      },
      async listOrganizationMemberships() {
        return [];
      },
      async listPendingInvitations() {
        return [];
      },
    };

    await expect(
      createBusinessWithOrganization({
        owner: { id: "app-user-1", clerkUserId: "user_owner" },
        profile,
        idempotencyKey: "alpha-key",
        businessRepository,
        membershipRepository,
        clerkOrganizationGateway: gateway,
        chartOfAccountsSeeder: {
          async ensureForTenant() {
            seedAttempts += 1;
            if (seedAttempts === 1) {
              throw new Error("seed failed");
            }
          },
        },
      })
    ).rejects.toThrow("seed failed");

    expect(clerkCalls).toEqual(["list", "create"]);
    expect(
      await businessRepository.findByClerkOrganizationId("org_alpha")
    ).not.toBeNull();

    const result = await createBusinessWithOrganization({
      owner: { id: "app-user-1", clerkUserId: "user_owner" },
      profile,
      idempotencyKey: "alpha-key",
      businessRepository,
      membershipRepository,
      clerkOrganizationGateway: gateway,
      chartOfAccountsSeeder: {
        async ensureForTenant() {
          seedAttempts += 1;
        },
      },
    });

    expect(seedAttempts).toBe(2);
    expect(clerkCalls).toEqual(["list", "create"]);
    expect(result.clerkOrganizationId).toBe("org_alpha");
    expect(result.membership.role).toBe("OWNER");
  });
});
