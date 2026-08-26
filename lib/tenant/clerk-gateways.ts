import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { ClerkInvitationGateway } from "@/modules/tenant/application/invite-member";
import type { ClerkOrganizationGateway } from "@/modules/tenant/application/business-setup";
import type { InvitationMetadataLookup } from "@/modules/tenant/application/org-lifecycle";
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

  async listOrganizationMemberships(input) {
    const client = await clerkClient();

    try {
      const memberships =
        await client.organizations.getOrganizationMembershipList({
          organizationId: input.clerkOrganizationId,
          limit: input.limit ?? 100,
        });

      return memberships.data.map((membership) => {
        const firstName = membership.publicUserData?.firstName ?? "";
        const lastName = membership.publicUserData?.lastName ?? "";
        const name = [firstName, lastName].filter(Boolean).join(" ").trim();

        return {
          clerkOrganizationMembershipId: membership.id,
          clerkUserId: membership.publicUserData?.userId ?? "",
          name: name.length > 0 ? name : null,
          email: membership.publicUserData?.identifier ?? null,
          clerkRole: membership.role,
        };
      });
    } catch {
      return [];
    }
  },

  async listPendingInvitations(input) {
    const client = await clerkClient();

    try {
      const invitations =
        await client.organizations.getOrganizationInvitationList({
          organizationId: input.clerkOrganizationId,
          status: ["pending"],
          limit: 100,
        });

      return invitations.data.map((invitation) => ({
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status ?? "pending",
      }));
    } catch {
      return [];
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
        publicMetadata: input.publicMetadata,
      });

    return { id: invitation.id };
  },
};

/**
 * Resolve invitation publicMetadata when membership webhooks omit it.
 * Looks up the Clerk user email, then finds a matching org invitation.
 */
export const clerkInvitationMetadataLookup: InvitationMetadataLookup = {
  async findInvitationPublicMetadata(input) {
    const client = await clerkClient();

    try {
      const user = await client.users.getUser(input.clerkUserId);
      const email =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
      if (!email) {
        return null;
      }

      const emailLower = email.trim().toLowerCase();

      // Fetch all invitations with pagination to find the accepted one
      const allInvitations = [];
      let hasMore = true;
      let offset = 0;
      const limit = 100;

      while (hasMore && offset < 1000) {
        const invitations =
          await client.organizations.getOrganizationInvitationList({
            organizationId: input.clerkOrganizationId,
            limit,
            offset,
          });

        allInvitations.push(...invitations.data);
        hasMore = invitations.data.length === limit;
        offset += limit;
      }

      // Find accepted invitation matching the user's email
      const match = allInvitations.find(
        (invitation) =>
          invitation.emailAddress.trim().toLowerCase() === emailLower &&
          invitation.status === "accepted"
      );

      if (!match?.publicMetadata) {
        return null;
      }

      return match.publicMetadata as Record<string, unknown>;
    } catch {
      return null;
    }
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
