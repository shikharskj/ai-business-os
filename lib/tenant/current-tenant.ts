import "server-only";

import { auth } from "@clerk/nextjs/server";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { verifyClerkOrganizationMembership } from "@/lib/tenant/clerk-gateways";
import {
  canManageBusinessSettings,
  type BusinessProfile,
  type TenantContext,
  type TenantMembership,
} from "@/modules/tenant/domain/types";
import {
  BusinessSettingsForbiddenError,
  TenantAccessDeniedError,
  TenantRequiredError,
} from "@/modules/tenant/domain/errors";
import type {
  BusinessRepository,
  MembershipRepository,
} from "@/modules/tenant/infrastructure/repositories";
import {
  prismaBusinessRepository,
  prismaMembershipRepository,
} from "@/modules/tenant/infrastructure/prisma-repositories";

async function resolveTenantMembership(input: {
  userId: string;
  clerkUserId: string;
  sessionOrgId: string | null | undefined;
  businessRepository: BusinessRepository;
  membershipRepository: MembershipRepository;
}): Promise<{ business: BusinessProfile; membership: TenantMembership } | null> {
  if (input.sessionOrgId) {
    const business = await input.businessRepository.findByClerkOrganizationId(
      input.sessionOrgId
    );

    if (business) {
      const membership = await input.membershipRepository.findActiveMembership(
        input.userId,
        business.id
      );

      if (membership) {
        return { business, membership };
      }
    }
  }

  const memberships = await input.membershipRepository.listActiveForUser(
    input.userId
  );

  if (memberships.length === 1) {
    const membership = memberships[0]!;
    const business = await input.businessRepository.findById(
      membership.tenantId
    );

    if (business) {
      return { business, membership };
    }
  }

  return null;
}

export async function getCurrentTenant(deps?: {
  businessRepository?: BusinessRepository;
  membershipRepository?: MembershipRepository;
}): Promise<TenantContext | null> {
  const user = await requireCurrentUser();
  const { orgId } = await auth();
  const businessRepository = deps?.businessRepository ?? prismaBusinessRepository;
  const membershipRepository =
    deps?.membershipRepository ?? prismaMembershipRepository;

  const resolved = await resolveTenantMembership({
    userId: user.id,
    clerkUserId: user.clerkUserId,
    sessionOrgId: orgId,
    businessRepository,
    membershipRepository,
  });

  if (!resolved) {
    return null;
  }

  await verifyClerkOrganizationMembership({
    clerkUserId: user.clerkUserId,
    clerkOrganizationId: resolved.business.clerkOrganizationId,
  });

  return {
    tenantId: resolved.business.id,
    business: resolved.business,
    membership: resolved.membership,
  };
}

export async function requireCurrentTenant(deps?: {
  businessRepository?: BusinessRepository;
  membershipRepository?: MembershipRepository;
}): Promise<TenantContext> {
  const tenant = await getCurrentTenant(deps);

  if (!tenant) {
    throw new TenantRequiredError();
  }

  return tenant;
}

export async function requireTenantForTrustedResource(input: {
  tenantId: string;
  deps?: {
    businessRepository?: BusinessRepository;
    membershipRepository?: MembershipRepository;
  };
}): Promise<TenantContext> {
  const tenant = await requireCurrentTenant(input.deps);

  if (tenant.tenantId !== input.tenantId) {
    throw new TenantAccessDeniedError();
  }

  return tenant;
}

export async function requireBusinessSettingsAccess(deps?: {
  businessRepository?: BusinessRepository;
  membershipRepository?: MembershipRepository;
}): Promise<TenantContext> {
  const tenant = await requireCurrentTenant(deps);

  if (!canManageBusinessSettings(tenant.membership.role)) {
    throw new BusinessSettingsForbiddenError();
  }

  return tenant;
}

export async function userHasActiveTenant(deps?: {
  membershipRepository?: MembershipRepository;
}): Promise<boolean> {
  const user = await requireCurrentUser();
  const membershipRepository =
    deps?.membershipRepository ?? prismaMembershipRepository;
  const memberships = await membershipRepository.listActiveForUser(user.id);
  return memberships.length > 0;
}
