import { describe, expect, it } from "vitest";

import { assignMemberRole } from "@/modules/tenant/application/assign-role";
import { createMemoryMembershipRepository } from "@/modules/tenant/infrastructure/repositories";
import type { TenantMembership } from "@/modules/tenant/domain/types";

function makeActiveMembership(
  overrides: Partial<TenantMembership> = {}
): TenantMembership {
  return {
    id: "mem_target",
    userId: "user_target",
    tenantId: "tenant_1",
    role: "STAFF",
    status: "ACTIVE",
    clerkOrganizationMembershipId: null,
    ...overrides,
  };
}

describe("assignMemberRole", () => {
  it("changes STAFF to ADMIN", async () => {
    const repo = createMemoryMembershipRepository([makeActiveMembership()]);
    const result = await assignMemberRole({
      targetUserId: "user_target",
      tenantId: "tenant_1",
      newRole: "ADMIN",
      membershipRepository: repo,
    });
    expect(result.role).toBe("ADMIN");
  });

  it("rejects assigning OWNER role", async () => {
    const repo = createMemoryMembershipRepository([makeActiveMembership()]);
    await expect(
      assignMemberRole({
        targetUserId: "user_target",
        tenantId: "tenant_1",
        newRole: "OWNER",
        membershipRepository: repo,
      })
    ).rejects.toThrow(/Cannot assign role/);
  });

  it("rejects changing the role of an OWNER", async () => {
    const repo = createMemoryMembershipRepository([
      makeActiveMembership({ role: "OWNER" }),
    ]);
    await expect(
      assignMemberRole({
        targetUserId: "user_target",
        tenantId: "tenant_1",
        newRole: "ADMIN",
        membershipRepository: repo,
      })
    ).rejects.toThrow(/Cannot change the role of a business owner/);
  });

  it("rejects when target has no active membership", async () => {
    const repo = createMemoryMembershipRepository([]);
    await expect(
      assignMemberRole({
        targetUserId: "user_target",
        tenantId: "tenant_1",
        newRole: "STAFF",
        membershipRepository: repo,
      })
    ).rejects.toThrow(/does not have an active membership/);
  });
});
