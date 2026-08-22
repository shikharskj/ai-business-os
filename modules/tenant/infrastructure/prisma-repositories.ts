import "server-only";

import { prisma } from "@/lib/db";
import type {
  BusinessProfile,
  BusinessType,
  GstRegistrationStatus,
  MembershipRole,
  MembershipStatus,
  TenantMembership,
} from "@/modules/tenant/domain/types";
import type {
  BusinessRepository,
  CreateBusinessRecordInput,
  MembershipRepository,
} from "@/modules/tenant/infrastructure/repositories";
import type { BusinessProfileInput } from "@/modules/tenant/schemas/business-profile.schema";

function mapBusiness(record: {
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
  lowStockThreshold: { toString(): string } | string;
  logoDocumentId: string | null;
  closedThroughPeriodKey: string | null;
}): BusinessProfile {
  return {
    id: record.id,
    clerkOrganizationId: record.clerkOrganizationId,
    name: record.name,
    type: record.type,
    ownerUserId: record.ownerUserId,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    state: record.state,
    postalCode: record.postalCode,
    country: record.country,
    phone: record.phone,
    email: record.email,
    gstRegistrationStatus: record.gstRegistrationStatus,
    gstin: record.gstin,
    financialYearStartMonth: record.financialYearStartMonth,
    timezone: record.timezone,
    currency: record.currency,
    defaultGstRateBps: record.defaultGstRateBps,
    lowStockThreshold: record.lowStockThreshold.toString(),
    logoDocumentId: record.logoDocumentId,
    closedThroughPeriodKey: record.closedThroughPeriodKey,
  };
}

function mapMembership(record: {
  id: string;
  userId: string;
  tenantId: string;
  role: MembershipRole;
  status: MembershipStatus;
  clerkOrganizationMembershipId: string | null;
}): TenantMembership {
  return {
    id: record.id,
    userId: record.userId,
    tenantId: record.tenantId,
    role: record.role,
    status: record.status,
    clerkOrganizationMembershipId: record.clerkOrganizationMembershipId,
  };
}

function toBusinessData(input: BusinessProfileInput | CreateBusinessRecordInput) {
  return {
    name: input.name,
    type: input.type,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? null,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country,
    phone: input.phone,
    email: input.email,
    gstRegistrationStatus: input.gstRegistrationStatus,
    gstin: input.gstin?.toUpperCase() ?? null,
    financialYearStartMonth: input.financialYearStartMonth,
    timezone: input.timezone,
    currency: input.currency.toUpperCase(),
    defaultGstRateBps: input.defaultGstRateBps ?? 1800,
    lowStockThreshold: input.lowStockThreshold ?? "5",
  };
}

export const prismaBusinessRepository: BusinessRepository = {
  async findById(tenantId) {
    const record = await prisma.business.findUnique({ where: { id: tenantId } });
    return record ? mapBusiness(record) : null;
  },

  async findByClerkOrganizationId(clerkOrganizationId) {
    const record = await prisma.business.findUnique({
      where: { clerkOrganizationId },
    });
    return record ? mapBusiness(record) : null;
  },

  async create(input) {
    const record = await prisma.business.create({
      data: {
        ...toBusinessData(input),
        clerkOrganizationId: input.clerkOrganizationId,
        ownerUserId: input.ownerUserId,
      },
    });

    return mapBusiness(record);
  },

  async update(tenantId, input) {
    const record = await prisma.business.update({
      where: { id: tenantId },
      data: toBusinessData(input),
    });

    return mapBusiness(record);
  },

  async setClosedThroughPeriodKey(tenantId, periodKey) {
    const record = await prisma.business.update({
      where: { id: tenantId },
      data: { closedThroughPeriodKey: periodKey },
    });
    return mapBusiness(record);
  },

  async setLogoDocumentId(tenantId, logoDocumentId) {
    const record = await prisma.business.update({
      where: { id: tenantId },
      data: { logoDocumentId },
    });
    return mapBusiness(record);
  },

  async clearLogoDocumentIdIfMatches(tenantId, expectedLogoDocumentId) {
    const result = await prisma.business.updateMany({
      where: {
        id: tenantId,
        logoDocumentId: expectedLogoDocumentId,
      },
      data: { logoDocumentId: null },
    });
    return result.count > 0;
  },

  async deleteByClerkOrganizationId(clerkOrganizationId) {
    await prisma.business.deleteMany({ where: { clerkOrganizationId } });
  },
};

export const prismaMembershipRepository: MembershipRepository = {
  async findActiveMembership(userId, tenantId) {
    const record = await prisma.membership.findFirst({
      where: { userId, tenantId, status: "ACTIVE" },
    });
    return record ? mapMembership(record) : null;
  },

  async findByClerkOrganizationMembershipId(clerkOrganizationMembershipId) {
    const record = await prisma.membership.findUnique({
      where: { clerkOrganizationMembershipId },
    });
    return record ? mapMembership(record) : null;
  },

  async listActiveForUser(userId) {
    const records = await prisma.membership.findMany({
      where: { userId, status: "ACTIVE" },
    });
    return records.map(mapMembership);
  },

  async listActiveForTenant(tenantId) {
    const records = await prisma.membership.findMany({
      where: { tenantId, status: "ACTIVE" },
    });
    return records.map(mapMembership);
  },

  async upsertActiveMembership(input) {
    const record = await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: input.tenantId,
        },
      },
      create: {
        userId: input.userId,
        tenantId: input.tenantId,
        role: input.role,
        status: "ACTIVE",
        clerkOrganizationMembershipId:
          input.clerkOrganizationMembershipId ?? null,
      },
      update: {
        role: input.role,
        status: "ACTIVE",
        clerkOrganizationMembershipId:
          input.clerkOrganizationMembershipId ?? undefined,
      },
    });

    return mapMembership(record);
  },

  async revokeMembership(input) {
    await prisma.membership.updateMany({
      where: { userId: input.userId, tenantId: input.tenantId },
      data: { status: "REVOKED" },
    });
  },

  async revokeByClerkOrganizationMembershipId(clerkOrganizationMembershipId) {
    await prisma.membership.updateMany({
      where: { clerkOrganizationMembershipId },
      data: { status: "REVOKED" },
    });
  },
};
