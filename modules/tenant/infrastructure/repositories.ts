import type {
  BusinessProfile,
  BusinessType,
  GstRegistrationStatus,
  MembershipRole,
  MembershipStatus,
  TenantMembership,
} from "@/modules/tenant/domain/types";
import type { BusinessProfileInput } from "@/modules/tenant/schemas/business-profile.schema";

export type CreateBusinessRecordInput = BusinessProfileInput & {
  clerkOrganizationId: string;
  ownerUserId: string;
};

export type BusinessRepository = {
  findById(tenantId: string): Promise<BusinessProfile | null>;
  findByClerkOrganizationId(
    clerkOrganizationId: string
  ): Promise<BusinessProfile | null>;
  create(input: CreateBusinessRecordInput): Promise<BusinessProfile>;
  update(
    tenantId: string,
    input: BusinessProfileInput
  ): Promise<BusinessProfile>;
  deleteByClerkOrganizationId(clerkOrganizationId: string): Promise<void>;
};

export type MembershipRepository = {
  findActiveMembership(
    userId: string,
    tenantId: string
  ): Promise<TenantMembership | null>;
  findByClerkOrganizationMembershipId(
    clerkOrganizationMembershipId: string
  ): Promise<TenantMembership | null>;
  listActiveForUser(userId: string): Promise<TenantMembership[]>;
  upsertActiveMembership(input: {
    userId: string;
    tenantId: string;
    role: MembershipRole;
    clerkOrganizationMembershipId?: string | null;
  }): Promise<TenantMembership>;
  revokeMembership(input: {
    userId: string;
    tenantId: string;
    clerkOrganizationMembershipId?: string | null;
  }): Promise<void>;
  revokeByClerkOrganizationMembershipId(
    clerkOrganizationMembershipId: string
  ): Promise<void>;
};

export type BusinessRecordSeed = BusinessProfile & {
  memberships?: TenantMembership[];
};

export function createMemoryBusinessRepository(
  initial: BusinessRecordSeed[] = []
): BusinessRepository {
  const businesses = new Map<string, BusinessProfile>(
    initial.map((business) => [business.id, business])
  );
  const byClerkOrgId = new Map<string, string>(
    initial.map((business) => [business.clerkOrganizationId, business.id])
  );

  return {
    async findById(tenantId) {
      return businesses.get(tenantId) ?? null;
    },

    async findByClerkOrganizationId(clerkOrganizationId) {
      const tenantId = byClerkOrgId.get(clerkOrganizationId);
      return tenantId ? (businesses.get(tenantId) ?? null) : null;
    },

    async create(input) {
      const existing = byClerkOrgId.get(input.clerkOrganizationId);
      if (existing) {
        return businesses.get(existing)!;
      }

      const created: BusinessProfile = {
        id: crypto.randomUUID(),
        clerkOrganizationId: input.clerkOrganizationId,
        name: input.name,
        type: input.type as BusinessType,
        ownerUserId: input.ownerUserId,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        phone: input.phone,
        email: input.email,
        gstRegistrationStatus:
          input.gstRegistrationStatus as GstRegistrationStatus,
        gstin: input.gstin?.toUpperCase() ?? null,
        financialYearStartMonth: input.financialYearStartMonth,
        timezone: input.timezone,
        currency: input.currency,
        defaultGstRateBps: input.defaultGstRateBps ?? 1800,
      };

      businesses.set(created.id, created);
      byClerkOrgId.set(created.clerkOrganizationId, created.id);
      return created;
    },

    async update(tenantId, input) {
      const existing = businesses.get(tenantId);
      if (!existing) {
        throw new Error("Business not found");
      }

      const updated: BusinessProfile = {
        ...existing,
        name: input.name,
        type: input.type as BusinessType,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        phone: input.phone,
        email: input.email,
        gstRegistrationStatus:
          input.gstRegistrationStatus as GstRegistrationStatus,
        gstin: input.gstin?.toUpperCase() ?? null,
        financialYearStartMonth: input.financialYearStartMonth,
        timezone: input.timezone,
        currency: input.currency,
        defaultGstRateBps: input.defaultGstRateBps ?? existing.defaultGstRateBps,
      };

      businesses.set(tenantId, updated);
      return updated;
    },

    async deleteByClerkOrganizationId(clerkOrganizationId) {
      const tenantId = byClerkOrgId.get(clerkOrganizationId);
      if (!tenantId) {
        return;
      }

      businesses.delete(tenantId);
      byClerkOrgId.delete(clerkOrganizationId);
    },
  };
}

export function createMemoryMembershipRepository(
  initial: TenantMembership[] = []
): MembershipRepository {
  const memberships = new Map<string, TenantMembership>(
    initial.map((membership) => [
      `${membership.userId}:${membership.tenantId}`,
      membership,
    ])
  );
  const byClerkMembershipId = new Map<string, TenantMembership>(
    initial
      .filter((membership) => membership.clerkOrganizationMembershipId)
      .map(
        (membership) =>
          [membership.clerkOrganizationMembershipId!, membership] as const
      )
  );

  return {
    async findActiveMembership(userId, tenantId) {
      const membership = memberships.get(`${userId}:${tenantId}`);
      return membership?.status === "ACTIVE" ? membership : null;
    },

    async findByClerkOrganizationMembershipId(clerkOrganizationMembershipId) {
      return byClerkMembershipId.get(clerkOrganizationMembershipId) ?? null;
    },

    async listActiveForUser(userId) {
      return [...memberships.values()].filter(
        (membership) =>
          membership.userId === userId && membership.status === "ACTIVE"
      );
    },

    async upsertActiveMembership(input) {
      const key = `${input.userId}:${input.tenantId}`;
      const existing = memberships.get(key);
      const upserted: TenantMembership = {
        id: existing?.id ?? crypto.randomUUID(),
        userId: input.userId,
        tenantId: input.tenantId,
        role: input.role,
        status: "ACTIVE" as MembershipStatus,
        clerkOrganizationMembershipId:
          input.clerkOrganizationMembershipId ??
          existing?.clerkOrganizationMembershipId ??
          null,
      };

      memberships.set(key, upserted);
      if (upserted.clerkOrganizationMembershipId) {
        byClerkMembershipId.set(
          upserted.clerkOrganizationMembershipId,
          upserted
        );
      }

      return upserted;
    },

    async revokeMembership(input) {
      const key = `${input.userId}:${input.tenantId}`;
      const existing = memberships.get(key);
      if (!existing) {
        return;
      }

      const revoked: TenantMembership = {
        ...existing,
        status: "REVOKED",
        clerkOrganizationMembershipId:
          input.clerkOrganizationMembershipId ??
          existing.clerkOrganizationMembershipId,
      };

      memberships.set(key, revoked);
      if (revoked.clerkOrganizationMembershipId) {
        byClerkMembershipId.delete(revoked.clerkOrganizationMembershipId);
      }
    },

    async revokeByClerkOrganizationMembershipId(clerkOrganizationMembershipId) {
      const existing = byClerkMembershipId.get(clerkOrganizationMembershipId);
      if (!existing) {
        return;
      }

      await this.revokeMembership({
        userId: existing.userId,
        tenantId: existing.tenantId,
        clerkOrganizationMembershipId,
      });
    },
  };
}
