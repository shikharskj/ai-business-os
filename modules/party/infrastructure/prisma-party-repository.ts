import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { Customer } from "@/modules/party/domain/types";
import type {
  PartyRepository,
} from "@/modules/party/infrastructure/repositories";

function mapCustomer(record: {
  id: string;
  tenantId: string;
  kind: string;
  name: string;
  phone: string | null;
  email: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  gstRegistrationStatus: Customer["gstRegistrationStatus"];
  gstin: string | null;
  status: Customer["status"];
  createdAt: Date;
  updatedAt: Date;
}): Customer {
  if (record.kind !== "CUSTOMER") {
    throw new Error("Expected a customer party.");
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    kind: "CUSTOMER",
    name: record.name,
    phone: record.phone,
    email: record.email,
    billingAddressLine1: record.billingAddressLine1,
    billingAddressLine2: record.billingAddressLine2,
    city: record.city,
    state: record.state,
    postalCode: record.postalCode,
    country: record.country,
    gstRegistrationStatus: record.gstRegistrationStatus,
    gstin: record.gstin,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function createPrismaPartyRepository(
  client: Pick<PrismaClient, "party">
): PartyRepository {
  return {
  async createCustomer(input) {
    const record = await client.party.create({
      data: {
        tenantId: input.tenantId,
        kind: "CUSTOMER",
        name: input.fields.name,
        phone: input.fields.phone ?? null,
        email: input.fields.email ?? null,
        billingAddressLine1: input.fields.billingAddressLine1 ?? null,
        billingAddressLine2: input.fields.billingAddressLine2 ?? null,
        city: input.fields.city ?? null,
        state: input.fields.state ?? null,
        postalCode: input.fields.postalCode ?? null,
        country: input.fields.country ?? "IN",
        gstRegistrationStatus: input.fields.gstRegistrationStatus,
        gstin: input.fields.gstin ?? null,
        status: "ACTIVE",
      },
    });
    return mapCustomer(record);
  },

  async updateCustomer(input) {
    const existing = await client.party.findFirst({
      where: {
        id: input.customerId,
        tenantId: input.tenantId,
        kind: "CUSTOMER",
      },
    });
    if (!existing) {
      return null;
    }

    const record = await client.party.update({
      where: { id: existing.id },
      data: {
        name: input.fields.name,
        phone: input.fields.phone ?? null,
        email: input.fields.email ?? null,
        billingAddressLine1: input.fields.billingAddressLine1 ?? null,
        billingAddressLine2: input.fields.billingAddressLine2 ?? null,
        city: input.fields.city ?? null,
        state: input.fields.state ?? null,
        postalCode: input.fields.postalCode ?? null,
        country: input.fields.country ?? "IN",
        gstRegistrationStatus: input.fields.gstRegistrationStatus,
        gstin: input.fields.gstin ?? null,
      },
    });
    return mapCustomer(record);
  },

  async findCustomerById(tenantId, customerId) {
    const record = await client.party.findFirst({
      where: { id: customerId, tenantId, kind: "CUSTOMER" },
    });
    return record ? mapCustomer(record) : null;
  },

  async listCustomers(filter) {
    const query = filter.query?.trim();
    const statusFilter =
      !filter.status || filter.status === "ALL"
        ? undefined
        : filter.status;

    const where: Prisma.PartyWhereInput = {
      tenantId: filter.tenantId,
      kind: "CUSTOMER",
      status: statusFilter,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { gstin: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const records = await client.party.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return records.map(mapCustomer);
  },

  async deactivateCustomer(tenantId, customerId) {
    try {
      const record = await client.party.updateMany({
        where: {
          id: customerId,
          tenantId,
          kind: "CUSTOMER",
          status: "ACTIVE",
        },
        data: { status: "INACTIVE" },
      });

      if (record.count === 0) {
        return null;
      }

      const updated = await client.party.findFirst({
        where: { id: customerId, tenantId, kind: "CUSTOMER" },
      });
      return updated ? mapCustomer(updated) : null;
    } catch {
      return null;
    }
  },
  };
}

export const prismaPartyRepository = createPrismaPartyRepository(prisma);
