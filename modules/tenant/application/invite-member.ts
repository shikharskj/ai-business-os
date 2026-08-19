import type { MembershipRole } from "@/modules/tenant/domain/types";

export type ClerkInvitationGateway = {
  createOrganizationInvitation(input: {
    clerkOrganizationId: string;
    emailAddress: string;
    role: MembershipRole;
    inviterClerkUserId: string;
  }): Promise<{ id: string }>;
};

const CLERK_ROLE_BY_MEMBERSHIP_ROLE: Record<
  Exclude<MembershipRole, "OWNER">,
  string
> = {
  ADMIN: "org:admin",
  STAFF: "org:member",
  ACCOUNTANT: "org:member",
};

export async function inviteOrganizationMember(input: {
  clerkOrganizationId: string;
  emailAddress: string;
  role: Exclude<MembershipRole, "OWNER">;
  inviterClerkUserId: string;
  invitationGateway: ClerkInvitationGateway;
}) {
  return input.invitationGateway.createOrganizationInvitation({
    clerkOrganizationId: input.clerkOrganizationId,
    emailAddress: input.emailAddress,
    role: input.role,
    inviterClerkUserId: input.inviterClerkUserId,
  });
}

export function toClerkOrganizationRole(
  role: Exclude<MembershipRole, "OWNER">
): string {
  return CLERK_ROLE_BY_MEMBERSHIP_ROLE[role];
}
