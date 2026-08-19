import type { MembershipRole, TenantMembership } from "@/modules/tenant/domain/types";
import type { MembershipRepository } from "@/modules/tenant/infrastructure/repositories";

const ASSIGNABLE_ROLES = new Set<MembershipRole>(["ADMIN", "STAFF", "ACCOUNTANT"]);

export class RoleAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleAssignmentError";
  }
}

export async function assignMemberRole(input: {
  targetUserId: string;
  tenantId: string;
  newRole: MembershipRole;
  membershipRepository: MembershipRepository;
}): Promise<TenantMembership> {
  if (!ASSIGNABLE_ROLES.has(input.newRole)) {
    throw new RoleAssignmentError(
      `Cannot assign role "${input.newRole}". Only ADMIN, STAFF, and ACCOUNTANT may be assigned.`
    );
  }

  const existing = await input.membershipRepository.findActiveMembership(
    input.targetUserId,
    input.tenantId
  );

  if (!existing) {
    throw new RoleAssignmentError(
      "Target user does not have an active membership in this business"
    );
  }

  if (existing.role === "OWNER") {
    throw new RoleAssignmentError("Cannot change the role of a business owner");
  }

  return input.membershipRepository.upsertActiveMembership({
    userId: input.targetUserId,
    tenantId: input.tenantId,
    role: input.newRole,
  });
}
