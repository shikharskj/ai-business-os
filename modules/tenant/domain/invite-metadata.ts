import type { MembershipRole } from "@/modules/tenant/domain/types";

/**
 * Clerk invitation / membership publicMetadata key for intended app role.
 * Wave 1 Auth: set on invite; read on organizationMembership.created/updated.
 */
export const APP_MEMBERSHIP_ROLE_METADATA_KEY = "appMembershipRole" as const;

export type AppMembershipRoleMetadata = {
  [APP_MEMBERSHIP_ROLE_METADATA_KEY]?: MembershipRole;
};

export function parseAppMembershipRole(
  value: unknown
): MembershipRole | null {
  if (
    value === "OWNER" ||
    value === "ADMIN" ||
    value === "STAFF" ||
    value === "ACCOUNTANT"
  ) {
    return value;
  }
  return null;
}
