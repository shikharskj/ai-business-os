import type { ApplicationUserStore } from "@/lib/auth/application-user-store";
import {
  mapClerkOrganizationRoleToMembershipRole,
  type MembershipRole,
} from "@/modules/tenant/domain/types";
import type {
  BusinessRepository,
  MembershipRepository,
} from "@/modules/tenant/infrastructure/repositories";
import type {
  OrganizationLifecycleEvent,
  OrganizationMembershipLifecycleEvent,
  TenantLifecycleEvent,
} from "@/modules/tenant/schemas/org-lifecycle.schema";

function mapInviteRoleToMembershipRole(role: string): MembershipRole {
  if (role === "ADMIN") {
    return "ADMIN";
  }

  if (role === "ACCOUNTANT") {
    return "ACCOUNTANT";
  }

  return "STAFF";
}

async function resolveApplicationUserId(
  userStore: ApplicationUserStore,
  clerkUserId: string
) {
  const user = await userStore.upsertByClerkUserId(clerkUserId);
  return user.id;
}

async function applyOrganizationMembershipEvent(
  deps: {
    userStore: ApplicationUserStore;
    businessRepository: BusinessRepository;
    membershipRepository: MembershipRepository;
  },
  event: OrganizationMembershipLifecycleEvent
) {
  const business = await deps.businessRepository.findByClerkOrganizationId(
    event.clerkOrganizationId
  );

  if (!business) {
    if (event.type === "organizationMembership.deleted") {
      await deps.membershipRepository.revokeByClerkOrganizationMembershipId(
        event.clerkOrganizationMembershipId
      );
    }

    return;
  }

  if (event.type === "organizationMembership.deleted") {
    const applicationUserId = await resolveApplicationUserId(
      deps.userStore,
      event.clerkUserId
    );

    await deps.membershipRepository.revokeMembership({
      userId: applicationUserId,
      tenantId: business.id,
      clerkOrganizationMembershipId: event.clerkOrganizationMembershipId,
    });
    return;
  }

  const applicationUserId = await resolveApplicationUserId(
    deps.userStore,
    event.clerkUserId
  );

  const existing = await deps.membershipRepository.findByClerkOrganizationMembershipId(
    event.clerkOrganizationMembershipId
  );

  const role = existing?.role ??
    mapClerkOrganizationRoleToMembershipRole(
      event.clerkRole,
      business.ownerUserId === applicationUserId
    );

  await deps.membershipRepository.upsertActiveMembership({
    userId: applicationUserId,
    tenantId: business.id,
    role,
    clerkOrganizationMembershipId: event.clerkOrganizationMembershipId,
  });
}

async function applyOrganizationEvent(
  deps: {
    businessRepository: BusinessRepository;
  },
  event: OrganizationLifecycleEvent
) {
  if (event.type === "organization.deleted") {
    await deps.businessRepository.deleteByClerkOrganizationId(
      event.clerkOrganizationId
    );
    return;
  }

  const business = await deps.businessRepository.findByClerkOrganizationId(
    event.clerkOrganizationId
  );

  if (!business) {
    return;
  }

  if (event.type === "organization.updated") {
    await deps.businessRepository.update(business.id, {
      name: event.name,
      type: business.type,
      addressLine1: business.addressLine1,
      addressLine2: business.addressLine2 ?? undefined,
      city: business.city,
      state: business.state,
      postalCode: business.postalCode,
      country: business.country,
      phone: business.phone,
      email: business.email,
      gstRegistrationStatus: business.gstRegistrationStatus,
      gstin: business.gstin ?? undefined,
      financialYearStartMonth: business.financialYearStartMonth,
      timezone: business.timezone,
      currency: business.currency,
      defaultGstRateBps: business.defaultGstRateBps,
      lowStockThreshold: business.lowStockThreshold,
    });
  }
}

export async function applyTenantLifecycleEvent(
  deps: {
    userStore: ApplicationUserStore;
    businessRepository: BusinessRepository;
    membershipRepository: MembershipRepository;
  },
  event: TenantLifecycleEvent
): Promise<void> {
  if (event.type.startsWith("organizationMembership.")) {
    await applyOrganizationMembershipEvent(
      deps,
      event as OrganizationMembershipLifecycleEvent
    );
    return;
  }

  await applyOrganizationEvent(deps, event as OrganizationLifecycleEvent);
}

export { mapInviteRoleToMembershipRole };
