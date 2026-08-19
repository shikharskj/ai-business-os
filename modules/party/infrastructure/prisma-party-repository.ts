import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type {
  Customer,
  CustomerInput,
  Party,
  PartyKind,
  Supplier,
  SupplierInput,
} from "@/modules/party/domain/types";
import type {
  PartyListFilter,
  PartyRepository,
} from "@/modules/party/infrastructure/repositories";

type PartyRecord = {
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
  gstRegistrationStatus: Party["gstRegistrationStatus"];
  gstin: string | null;
  status: Party["status"];
  createdAt: Date;
  updatedAt: Date;
};

function mapParty(record: PartyRecord): Party {
  if (record.kind !== "CUSTOMER" && record.kind !== "SUPPLIER") {
    throw new Error("Unknown party kind.");
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    kind: record.kind,
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

function asCustomer(record: PartyRecord): Customer {
  const party = mapParty(record);
  if (party.kind !== "CUSTOMER") {
    throw new Error("Expected a customer party.");
  }
  return { ...party, kind: "CUSTOMER" };
}

function asSupplier(record: PartyRecord): Supplier {
  const party = mapParty(record);
  if (party.kind !== "SUPPLIER") {
    throw new Error("Expected a supplier party.");
  }
  return { ...party, kind: "SUPPLIER" };
}

function fieldData(fields: CustomerInput | SupplierInput) {
  return {
    name: fields.name,
    phone: fields.phone ?? null,
    email: fields.email ?? null,
    billingAddressLine1: fields.billingAddressLine1 ?? null,
    billingAddressLine2: fields.billingAddressLine2 ?? null,
    city: fields.city ?? null,
    state: fields.state ?? null,
    postalCode: fields.postalCode ?? null,
    country: fields.country ?? "IN",
    gstRegistrationStatus: fields.gstRegistrationStatus,
    gstin: fields.gstin ?? null,
  };
}

function listWhere(kind: PartyKind, filter: PartyListFilter): Prisma.PartyWhereInput {
  const query = filter.query?.trim();
  const statusFilter =
    !filter.status || filter.status === "ALL" ? undefined : filter.status;

  return {
    tenantId: filter.tenantId,
    kind,
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
          status: "ACTIVE",
          ...fieldData(input.fields),
        },
      });
      return asCustomer(record);
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
        data: fieldData(input.fields),
      });
      return asCustomer(record);
    },

    async findCustomerById(tenantId, customerId) {
      const record = await client.party.findFirst({
        where: { id: customerId, tenantId, kind: "CUSTOMER" },
      });
      return record ? asCustomer(record) : null;
    },

    async listCustomers(filter) {
      const records = await client.party.findMany({
        where: listWhere("CUSTOMER", filter),
        orderBy: { name: "asc" },
      });
      return records.map(asCustomer);
    },

    async deactivateCustomer(tenantId, customerId) {
      const result = await client.party.updateMany({
        where: {
          id: customerId,
          tenantId,
          kind: "CUSTOMER",
          status: "ACTIVE",
        },
        data: { status: "INACTIVE" },
      });
      if (result.count === 0) {
        return null;
      }
      const updated = await client.party.findFirst({
        where: { id: customerId, tenantId, kind: "CUSTOMER" },
      });
      return updated ? asCustomer(updated) : null;
    },

    async createSupplier(input) {
      const record = await client.party.create({
        data: {
          tenantId: input.tenantId,
          kind: "SUPPLIER",
          status: "ACTIVE",
          ...fieldData(input.fields),
        },
      });
      return asSupplier(record);
    },

    async updateSupplier(input) {
      const existing = await client.party.findFirst({
        where: {
          id: input.supplierId,
          tenantId: input.tenantId,
          kind: "SUPPLIER",
        },
      });
      if (!existing) {
        return null;
      }

      const record = await client.party.update({
        where: { id: existing.id },
        data: fieldData(input.fields),
      });
      return asSupplier(record);
    },

    async findSupplierById(tenantId, supplierId) {
      const record = await client.party.findFirst({
        where: { id: supplierId, tenantId, kind: "SUPPLIER" },
      });
      return record ? asSupplier(record) : null;
    },

    async listSuppliers(filter) {
      const records = await client.party.findMany({
        where: listWhere("SUPPLIER", filter),
        orderBy: { name: "asc" },
      });
      return records.map(asSupplier);
    },

    async deactivateSupplier(tenantId, supplierId) {
      const result = await client.party.updateMany({
        where: {
          id: supplierId,
          tenantId,
          kind: "SUPPLIER",
          status: "ACTIVE",
        },
        data: { status: "INACTIVE" },
      });
      if (result.count === 0) {
        return null;
      }
      const updated = await client.party.findFirst({
        where: { id: supplierId, tenantId, kind: "SUPPLIER" },
      });
      return updated ? asSupplier(updated) : null;
    },
  };
}

export const prismaPartyRepository = createPrismaPartyRepository(prisma);
