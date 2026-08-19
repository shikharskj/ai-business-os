import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { ClerkInvitationGateway } from "@/modules/tenant/application/invite-member";
import type { ClerkOrganizationGateway } from "@/modules/tenant/application/business-setup";
import { toClerkOrganizationRole } from "@/modules/tenant/application/invite-member";
import type { MembershipRole } from "@/modules/tenant/domain/types";
import { TenantMembershipUnavailableError } from "@/modules/tenant/domain/errors";

export const clerkOrganizationGateway: ClerkOrganizationGateway = {
  async createOrganization(input) {
    const client = await clerkClient();
    const organization = await client.organizations.createOrganization({
      name: input.name,
      createdBy: input.createdByClerkUserId,
    });
    return { id: organization.id };
  },

  async deleteOrganization(clerkOrganizationId) {
    const client = await clerkClient();
    await client.organizations.deleteOrganization(clerkOrganizationId);
  },

  async listUserOrganizations(clerkUserId) {
    const client = await clerkClient();

    try {
      const memberships =
        await client.users.getOrganizationMembershipList({ userId: clerkUserId });
      return memberships.data.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
      }));
    } catch {
      return [];
    }
  },

  async getOrganizationMembership(input) {
    const client = await clerkClient();

    try {
      const memberships =
        await client.organizations.getOrganizationMembershipList({
          organizationId: input.clerkOrganizationId,
          userId: [input.clerkUserId],
          limit: 1,
        });

      const membership = memberships.data[0];
      if (!membership) {
        return null;
      }

      return { role: membership.role };
    } catch {
      return null;
    }
  },
};

export const clerkInvitationGateway: ClerkInvitationGateway = {
  async createOrganizationInvitation(input) {
    const client = await clerkClient();
    const invitation =
      await client.organizations.createOrganizationInvitation({
        organizationId: input.clerkOrganizationId,
        emailAddress: input.emailAddress,
        inviterUserId: input.inviterClerkUserId,
        role:
          input.role === "OWNER"
            ? "org:admin"
            : toClerkOrganizationRole(
                input.role as Exclude<MembershipRole, "OWNER">
              ),
      });

    return { id: invitation.id };
  },
};

export async function verifyClerkOrganizationMembership(input: {
  clerkUserId: string;
  clerkOrganizationId: string;
}): Promise<void> {
  const membership = await clerkOrganizationGateway.getOrganizationMembership({
    clerkOrganizationId: input.clerkOrganizationId,
    clerkUserId: input.clerkUserId,
  });

  if (!membership) {
    throw new TenantMembershipUnavailableError();
  }
}
