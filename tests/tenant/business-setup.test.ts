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
      },
    });

    expect(result.business.gstin).toBe("27AABCU9603R1ZM");
    expect(result.business.financialYearStartMonth).toBe(4);
    expect(result.business.clerkOrganizationId).toBe("org_alpha");
    expect(result.membership.role).toBe("OWNER");
    expect(clerkCalls).toEqual(["create"]);
  });
});
