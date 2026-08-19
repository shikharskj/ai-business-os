export type BusinessType =
  | "PROPRIETORSHIP"
  | "PARTNERSHIP"
  | "PRIVATE_LIMITED"
  | "LLP"
  | "OTHER";

export type GstRegistrationStatus =
  | "NOT_REGISTERED"
  | "REGISTERED"
  | "COMPOSITION";

export type MembershipRole = "OWNER" | "ADMIN" | "STAFF" | "ACCOUNTANT";

export type MembershipStatus = "ACTIVE" | "REVOKED";

export type BusinessProfile = {
  id: string;
  clerkOrganizationId: string;
  name: string;
  type: BusinessType;
  ownerUserId: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  gstRegistrationStatus: GstRegistrationStatus;
  gstin: string | null;
  financialYearStartMonth: number;
  timezone: string;
  currency: string;
  defaultGstRateBps: number;
};

export type TenantMembership = {
  id: string;
  userId: string;
  tenantId: string;
  role: MembershipRole;
  status: MembershipStatus;
  clerkOrganizationMembershipId: string | null;
};

export type TenantContext = {
  tenantId: string;
  business: BusinessProfile;
  membership: TenantMembership;
};

export const ADMINISTRATIVE_ROLES = new Set<MembershipRole>(["OWNER", "ADMIN"]);

export function canManageBusinessSettings(role: MembershipRole): boolean {
  return ADMINISTRATIVE_ROLES.has(role);
}

export function mapClerkOrganizationRoleToMembershipRole(
  clerkRole: string,
  isCreator: boolean
): MembershipRole {
  if (isCreator || clerkRole === "org:admin") {
    return "OWNER";
  }

  if (clerkRole.includes("admin")) {
    return "ADMIN";
  }

  return "STAFF";
}
