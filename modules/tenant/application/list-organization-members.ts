import type { ClerkOrganizationGateway } from "@/modules/tenant/application/business-setup";
import type { MembershipRole } from "@/modules/tenant/domain/types";
import type { MembershipRepository } from "@/modules/tenant/infrastructure/repositories";

export type OrganizationMemberRow = {
  userId: string;
  name: string | null;
  email: string | null;
  role: MembershipRole;
  clerkOrganizationMembershipId: string | null;
};

export type PendingInvitationRow = {
  id: string;
  emailAddress: string;
  role: string;
  status: string;
};

export type OrganizationMembersSnapshot = {
  members: OrganizationMemberRow[];
  pendingInvitations: PendingInvitationRow[];
};

export async function listOrganizationMembers(input: {
  tenantId: string;
  clerkOrganizationId: string;
  memberships: MembershipRepository;
  clerkOrganization: ClerkOrganizationGateway;
}): Promise<OrganizationMembersSnapshot> {
  const [appMemberships, clerkMembers, pendingInvitations] = await Promise.all([
    input.memberships.listActiveForTenant(input.tenantId),
    input.clerkOrganization.listOrganizationMemberships({
      clerkOrganizationId: input.clerkOrganizationId,
    }),
    input.clerkOrganization.listPendingInvitations({
      clerkOrganizationId: input.clerkOrganizationId,
    }),
  ]);

  const clerkByMembershipId = new Map(
    clerkMembers.map((member) => [
      member.clerkOrganizationMembershipId,
      member,
    ])
  );

  const members: OrganizationMemberRow[] = appMemberships.map((membership) => {
    const clerkMember = membership.clerkOrganizationMembershipId
      ? clerkByMembershipId.get(membership.clerkOrganizationMembershipId)
      : undefined;

    return {
      userId: membership.userId,
      name: clerkMember?.name ?? null,
      email: clerkMember?.email ?? null,
      role: membership.role,
      clerkOrganizationMembershipId: membership.clerkOrganizationMembershipId,
    };
  });

  members.sort((a, b) => {
    const roleOrder: Record<MembershipRole, number> = {
      OWNER: 0,
      ADMIN: 1,
      STAFF: 2,
      ACCOUNTANT: 3,
    };
    const byRole = roleOrder[a.role] - roleOrder[b.role];
    if (byRole !== 0) {
      return byRole;
    }
    return (a.name ?? a.email ?? a.userId).localeCompare(
      b.name ?? b.email ?? b.userId
    );
  });

  return {
    members,
    pendingInvitations,
  };
}
