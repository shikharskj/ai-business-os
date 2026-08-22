import { describe, expect, it } from "vitest";

import {
  createMemoryMembershipRepository,
} from "@/modules/tenant/infrastructure/repositories";
import { listOrganizationMembers } from "@/modules/tenant/application/list-organization-members";
import type { ClerkOrganizationGateway } from "@/modules/tenant/application/business-setup";

function mockClerkGateway(
  overrides: Partial<ClerkOrganizationGateway> = {}
): ClerkOrganizationGateway {
  return {
    createOrganization: async () => ({ id: "org_1" }),
    deleteOrganization: async () => {},
    getOrganizationMembership: async () => null,
    listUserOrganizations: async () => [],
    listOrganizationMemberships: async () => [],
    listPendingInvitations: async () => [],
    ...overrides,
  };
}

describe("listOrganizationMembers", () => {
  it("merges application roles with clerk display fields", async () => {
    const memberships = createMemoryMembershipRepository([
      {
        id: "mem-1",
        userId: "user-1",
        tenantId: "tenant-a",
        role: "ADMIN",
        status: "ACTIVE",
        clerkOrganizationMembershipId: "om_1",
      },
      {
        id: "mem-2",
        userId: "user-2",
        tenantId: "tenant-a",
        role: "STAFF",
        status: "ACTIVE",
        clerkOrganizationMembershipId: "om_2",
      },
    ]);

    const snapshot = await listOrganizationMembers({
      tenantId: "tenant-a",
      clerkOrganizationId: "org_clerk",
      memberships,
      clerkOrganization: mockClerkGateway({
        listOrganizationMemberships: async () => [
          {
            clerkOrganizationMembershipId: "om_1",
            clerkUserId: "clerk-1",
            name: "Ada Owner",
            email: "ada@example.com",
            clerkRole: "org:admin",
          },
          {
            clerkOrganizationMembershipId: "om_2",
            clerkUserId: "clerk-2",
            name: "Sam Staff",
            email: "sam@example.com",
            clerkRole: "org:member",
          },
        ],
        listPendingInvitations: async () => [
          {
            id: "inv_1",
            emailAddress: "pending@example.com",
            role: "org:member",
            status: "pending",
          },
        ],
      }),
    });

    expect(snapshot.members).toHaveLength(2);
    expect(snapshot.members[0]?.role).toBe("ADMIN");
    expect(snapshot.members[0]?.email).toBe("ada@example.com");
    expect(snapshot.members[1]?.name).toBe("Sam Staff");
    expect(snapshot.pendingInvitations).toHaveLength(1);
  });

  it("lists only active memberships for the tenant", async () => {
    const memberships = createMemoryMembershipRepository([
      {
        id: "mem-1",
        userId: "user-1",
        tenantId: "tenant-a",
        role: "OWNER",
        status: "ACTIVE",
        clerkOrganizationMembershipId: "om_1",
      },
      {
        id: "mem-2",
        userId: "user-2",
        tenantId: "tenant-b",
        role: "ADMIN",
        status: "ACTIVE",
        clerkOrganizationMembershipId: "om_2",
      },
    ]);

    const snapshot = await listOrganizationMembers({
      tenantId: "tenant-a",
      clerkOrganizationId: "org_clerk",
      memberships,
      clerkOrganization: mockClerkGateway(),
    });

    expect(snapshot.members).toHaveLength(1);
    expect(snapshot.members[0]?.userId).toBe("user-1");
  });
});

describe("MembershipRepository.listActiveForTenant", () => {
  it("returns active memberships for one tenant", async () => {
    const memberships = createMemoryMembershipRepository([
      {
        id: "mem-1",
        userId: "user-1",
        tenantId: "tenant-a",
        role: "OWNER",
        status: "ACTIVE",
        clerkOrganizationMembershipId: null,
      },
      {
        id: "mem-2",
        userId: "user-2",
        tenantId: "tenant-a",
        role: "STAFF",
        status: "REVOKED",
        clerkOrganizationMembershipId: null,
      },
    ]);

    const rows = await memberships.listActiveForTenant("tenant-a");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe("OWNER");
  });
});
