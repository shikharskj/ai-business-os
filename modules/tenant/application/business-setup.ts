import type { ApplicationUser } from "@/lib/auth/application-user-store";
import {
  mapClerkOrganizationRoleToMembershipRole,
  type BusinessProfile,
  type TenantMembership,
} from "@/modules/tenant/domain/types";
import type {
  BusinessRepository,
  MembershipRepository,
} from "@/modules/tenant/infrastructure/repositories";
import {
  businessProfileInputSchema,
  type BusinessProfileInput,
} from "@/modules/tenant/schemas/business-profile.schema";

export type ClerkOrganizationGateway = {
  createOrganization(input: {
    name: string;
    createdByClerkUserId: string;
  }): Promise<{ id: string }>;
  deleteOrganization(clerkOrganizationId: string): Promise<void>;
  getOrganizationMembership(input: {
    clerkOrganizationId: string;
    clerkUserId: string;
  }): Promise<{ role: string } | null>;
  listUserOrganizations(clerkUserId: string): Promise<
    { id: string; name: string }[]
  >;
  listOrganizationMemberships(input: {
    clerkOrganizationId: string;
    limit?: number;
  }): Promise<
    {
      clerkOrganizationMembershipId: string;
      clerkUserId: string;
      name: string | null;
      email: string | null;
      clerkRole: string;
    }[]
  >;
  listPendingInvitations(input: {
    clerkOrganizationId: string;
  }): Promise<
    {
      id: string;
      emailAddress: string;
      role: string;
      status: string;
    }[]
  >;
};

export type CreateBusinessResult = {
  business: BusinessProfile;
  membership: TenantMembership;
  clerkOrganizationId: string;
};

export async function createBusinessWithOrganization(input: {
  owner: ApplicationUser;
  profile: BusinessProfileInput;
  idempotencyKey: string;
  businessRepository: BusinessRepository;
  membershipRepository: MembershipRepository;
  clerkOrganizationGateway: ClerkOrganizationGateway;
  chartOfAccountsSeeder?: { ensureForTenant(tenantId: string): Promise<void> };
}): Promise<CreateBusinessResult> {
  const profile = businessProfileInputSchema.parse(input.profile);

  const existingMemberships = await input.membershipRepository.listActiveForUser(
    input.owner.id
  );

  for (const membership of existingMemberships) {
    const business = await input.businessRepository.findById(membership.tenantId);
    if (business && business.name === profile.name) {
      await input.chartOfAccountsSeeder?.ensureForTenant(business.id);
      return {
        business,
        membership,
        clerkOrganizationId: business.clerkOrganizationId,
      };
    }
  }

  const existingClerkOrgs = await input.clerkOrganizationGateway.listUserOrganizations(
    input.owner.clerkUserId
  );
  const matchingOrg = existingClerkOrgs.find((org) => org.name === profile.name);

  if (matchingOrg) {
    const existingBusiness =
      await input.businessRepository.findByClerkOrganizationId(matchingOrg.id);

    const business =
      existingBusiness ??
      (await input.businessRepository.create({
        ...profile,
        clerkOrganizationId: matchingOrg.id,
        ownerUserId: input.owner.id,
      }));

    const membership = await input.membershipRepository.upsertActiveMembership({
      userId: input.owner.id,
      tenantId: business.id,
      role: "OWNER",
    });

    await input.chartOfAccountsSeeder?.ensureForTenant(business.id);

    return {
      business,
      membership,
      clerkOrganizationId: matchingOrg.id,
    };
  }

  let clerkOrganizationId: string | null = null;
  let localRecordsCreated = false;

  try {
    const organization = await input.clerkOrganizationGateway.createOrganization({
      name: profile.name,
      createdByClerkUserId: input.owner.clerkUserId,
    });
    clerkOrganizationId = organization.id;

    const business = await input.businessRepository.create({
      ...profile,
      clerkOrganizationId,
      ownerUserId: input.owner.id,
    });

    const membership = await input.membershipRepository.upsertActiveMembership({
      userId: input.owner.id,
      tenantId: business.id,
      role: "OWNER",
    });
    localRecordsCreated = true;

    await input.chartOfAccountsSeeder?.ensureForTenant(business.id);

    return {
      business,
      membership,
      clerkOrganizationId,
    };
  } catch (error) {
    if (clerkOrganizationId && !localRecordsCreated) {
      await input.clerkOrganizationGateway
        .deleteOrganization(clerkOrganizationId)
        .catch(() => undefined);
    }

    throw error;
  }
}

export async function attachExistingOrganizationToBusiness(input: {
  owner: ApplicationUser;
  clerkOrganizationId: string;
  profile: BusinessProfileInput;
  businessRepository: BusinessRepository;
  membershipRepository: MembershipRepository;
  clerkOrganizationGateway: ClerkOrganizationGateway;
  chartOfAccountsSeeder?: { ensureForTenant(tenantId: string): Promise<void> };
}): Promise<CreateBusinessResult> {
  const profile = businessProfileInputSchema.parse(input.profile);
  const clerkMembership =
    await input.clerkOrganizationGateway.getOrganizationMembership({
      clerkOrganizationId: input.clerkOrganizationId,
      clerkUserId: input.owner.clerkUserId,
    });

  if (!clerkMembership) {
    throw new Error("Authenticated user is not a member of this organization");
  }

  const role = mapClerkOrganizationRoleToMembershipRole(
    clerkMembership.role,
    false
  );

  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only organization admins can attach a business workspace");
  }

  const business =
    (await input.businessRepository.findByClerkOrganizationId(
      input.clerkOrganizationId
    )) ??
    (await input.businessRepository.create({
      ...profile,
      clerkOrganizationId: input.clerkOrganizationId,
      ownerUserId: input.owner.id,
    }));

  const membership = await input.membershipRepository.upsertActiveMembership({
    userId: input.owner.id,
    tenantId: business.id,
    role,
  });

  await input.chartOfAccountsSeeder?.ensureForTenant(business.id);

  return {
    business,
    membership,
    clerkOrganizationId: input.clerkOrganizationId,
  };
}

export async function updateBusinessProfile(input: {
  tenantId: string;
  profile: BusinessProfileInput;
  businessRepository: BusinessRepository;
}): Promise<BusinessProfile> {
  const profile = businessProfileInputSchema.parse(input.profile);
  return input.businessRepository.update(input.tenantId, profile);
}
