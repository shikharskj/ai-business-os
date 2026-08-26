import { describe, expect, it, vi } from "vitest";

import { createMemoryApplicationUserStore } from "@/lib/auth/application-user-store";
import { applyTenantLifecycleEvent } from "@/modules/tenant/application/org-lifecycle";
import { APP_MEMBERSHIP_ROLE_METADATA_KEY } from "@/modules/tenant/domain/invite-metadata";
import { mapClerkOrganizationRoleToMembershipRole } from "@/modules/tenant/domain/types";
import {
  createMemoryBusinessRepository,
  createMemoryMembershipRepository,
} from "@/modules/tenant/infrastructure/repositories";
import { parseTenantLifecycleEvent } from "@/modules/tenant/schemas/org-lifecycle.schema";

describe("mapClerkOrganizationRoleToMembershipRole", () => {
  it("maps org:admin to ADMIN unless isCreator", () => {
    expect(mapClerkOrganizationRoleToMembershipRole("org:admin", false)).toBe(
      "ADMIN"
    );
    expect(mapClerkOrganizationRoleToMembershipRole("org:admin", true)).toBe(
      "OWNER"
    );
    expect(mapClerkOrganizationRoleToMembershipRole("org:member", false)).toBe(
      "STAFF"
    );
  });
});

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
      defaultGstRateBps: 1800,
      lowStockThreshold: "5",
      closedThroughPeriodKey: null,
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
      publicMetadata: null,
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
    expect(membership?.role).toBe("STAFF");
  });

  it("prefers appMembershipRole metadata over Clerk org role", async () => {
    const membershipRepository = createMemoryMembershipRepository();

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      {
        type: "organizationMembership.created",
        clerkOrganizationMembershipId: "om_acct",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
        clerkRole: "org:member",
        publicMetadata: {
          [APP_MEMBERSHIP_ROLE_METADATA_KEY]: "ACCOUNTANT",
        },
      }
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );
    expect(membership?.role).toBe("ACCOUNTANT");
  });

  it("maps org:admin membership to ADMIN for non-owners", async () => {
    const membershipRepository = createMemoryMembershipRepository();

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      {
        type: "organizationMembership.created",
        clerkOrganizationMembershipId: "om_admin",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
        clerkRole: "org:admin",
        publicMetadata: null,
      }
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );
    expect(membership?.role).toBe("ADMIN");
  });

  it("recomputes role on membership.updated instead of sticky existing role", async () => {
    const membershipRepository = createMemoryMembershipRepository([
      {
        id: "membership-sticky",
        userId: "app-user-2",
        tenantId: "tenant-a",
        role: "STAFF",
        status: "ACTIVE",
        clerkOrganizationMembershipId: "om_upd",
      },
    ]);

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      {
        type: "organizationMembership.updated",
        clerkOrganizationMembershipId: "om_upd",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
        clerkRole: "org:admin",
        publicMetadata: {
          [APP_MEMBERSHIP_ROLE_METADATA_KEY]: "ADMIN",
        },
      }
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );
    expect(membership?.role).toBe("ADMIN");
  });

  it("assigns OWNER when membership user matches business ownerUserId", async () => {
    const membershipRepository = createMemoryMembershipRepository();

    await applyTenantLifecycleEvent(
      { userStore, businessRepository, membershipRepository },
      {
        type: "organizationMembership.created",
        clerkOrganizationMembershipId: "om_owner",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_owner",
        clerkRole: "org:admin",
        publicMetadata: null,
      }
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-1",
      "tenant-a"
    );
    expect(membership?.role).toBe("OWNER");
  });

  it("parses public_metadata from Clerk membership webhook payloads", () => {
    const event = parseTenantLifecycleEvent({
      type: "organizationMembership.created",
      data: {
        id: "om_meta",
        role: "org:member",
        organization: { id: "org_a", name: "Alpha" },
        public_user_data: { user_id: "user_staff" },
        public_metadata: { appMembershipRole: "ACCOUNTANT" },
      },
    });

    expect(event).toMatchObject({
      type: "organizationMembership.created",
      publicMetadata: { appMembershipRole: "ACCOUNTANT" },
    });
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
        publicMetadata: null,
      }
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );

    expect(membership?.status).toBe("ACTIVE");
  });

  it("recovers ACCOUNTANT from invitation metadata when membership metadata is empty", async () => {
    const membershipRepository = createMemoryMembershipRepository();
    const invitationMetadataLookup = {
      findInvitationPublicMetadata: vi.fn(async () => ({
        [APP_MEMBERSHIP_ROLE_METADATA_KEY]: "ACCOUNTANT",
      })),
    };

    await applyTenantLifecycleEvent(
      {
        userStore,
        businessRepository,
        membershipRepository,
        invitationMetadataLookup,
      },
      {
        type: "organizationMembership.created",
        clerkOrganizationMembershipId: "om_invite_acct",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
        clerkRole: "org:member",
        publicMetadata: null,
      }
    );

    expect(invitationMetadataLookup.findInvitationPublicMetadata).toHaveBeenCalledWith({
      clerkOrganizationId: "org_a",
      clerkUserId: "user_staff",
    });

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );
    expect(membership?.role).toBe("ACCOUNTANT");
  });

  it("ignores OWNER in invitation metadata for non-owners", async () => {
    const membershipRepository = createMemoryMembershipRepository();
    const invitationMetadataLookup = {
      findInvitationPublicMetadata: vi.fn(async () => ({
        [APP_MEMBERSHIP_ROLE_METADATA_KEY]: "OWNER",
      })),
    };

    await applyTenantLifecycleEvent(
      {
        userStore,
        businessRepository,
        membershipRepository,
        invitationMetadataLookup,
      },
      {
        type: "organizationMembership.created",
        clerkOrganizationMembershipId: "om_invite_owner",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
        clerkRole: "org:member",
        publicMetadata: null,
      }
    );

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );
    expect(membership?.role).toBe("STAFF");
  });

  it("does not call invitation lookup when membership metadata already has a role", async () => {
    const membershipRepository = createMemoryMembershipRepository();
    const invitationMetadataLookup = {
      findInvitationPublicMetadata: vi.fn(async () => ({
        [APP_MEMBERSHIP_ROLE_METADATA_KEY]: "STAFF",
      })),
    };

    await applyTenantLifecycleEvent(
      {
        userStore,
        businessRepository,
        membershipRepository,
        invitationMetadataLookup,
      },
      {
        type: "organizationMembership.created",
        clerkOrganizationMembershipId: "om_meta",
        clerkOrganizationId: "org_a",
        clerkUserId: "user_staff",
        clerkRole: "org:member",
        publicMetadata: {
          [APP_MEMBERSHIP_ROLE_METADATA_KEY]: "ACCOUNTANT",
        },
      }
    );

    expect(
      invitationMetadataLookup.findInvitationPublicMetadata
    ).not.toHaveBeenCalled();

    const membership = await membershipRepository.findActiveMembership(
      "app-user-2",
      "tenant-a"
    );
    expect(membership?.role).toBe("ACCOUNTANT");
  });
});
