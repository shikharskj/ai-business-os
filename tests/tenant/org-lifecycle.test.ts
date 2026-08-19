import { describe, expect, it } from "vitest";

import { createMemoryApplicationUserStore } from "@/lib/auth/application-user-store";
import { applyTenantLifecycleEvent } from "@/modules/tenant/application/org-lifecycle";
import {
  createMemoryBusinessRepository,
  createMemoryMembershipRepository,
} from "@/modules/tenant/infrastructure/repositories";

describe("tenant org lifecycle", () => {
  const userStore = createMemoryApplicationUserStore([
    { id: "app-user-1", clerkUserId: "user_owner" },
    { id: "app-user-2", clerkUserId: "user_staff" },
  ]);

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
    },
  ]);

  it("handles duplicate membership.created replay idempotently", async () => {
    const membershipRepository = createMemoryMembershipRepository();

    const event = {
      type: "organizationMembership.created" as const,
      clerkOrganizationMembershipId: "om_1",
      clerkOrganizationId: "org_a",
      clerkUserId: "user_staff",
      clerkRole: "org:member",
    };

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      event
    );
    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      event
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );

    expect(membership?.status).toBe("ACTIVE");
    expect(membership?.clerkOrganizationMembershipId).toBe("om_1");
  });

  it("handles revocation before webhook delivery and duplicate delete replay", async () => {
    const membershipRepository = createMemoryMembershipRepository([
      {
        id: "membership-1",
        userId: "app-user-2",
        tenantId: "tenant-a",
        role: "STAFF",
        status: "ACTIVE",
        clerkOrganizationMembershipId: "om_1",
      },
    ]);

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      {
        type: "organizationMembership.deleted",
        clerkOrganizationMembershipId: "om_1",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
      }
    );

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      {
        type: "organizationMembership.deleted",
        clerkOrganizationMembershipId: "om_1",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
      }
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );

    expect(membership).toBeNull();
  });

  it("handles out-of-order delete before create without throwing", async () => {
    const membershipRepository = createMemoryMembershipRepository();

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      {
        type: "organizationMembership.deleted",
        clerkOrganizationMembershipId: "om_late",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
      }
    );

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      {
        type: "organizationMembership.created",
        clerkOrganizationMembershipId: "om_late",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
        clerkRole: "org:member",
      }
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );

    expect(membership?.status).toBe("ACTIVE");
  });
});
