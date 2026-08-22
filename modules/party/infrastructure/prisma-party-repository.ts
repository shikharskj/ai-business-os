import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fetchOrderedPage } from "@/modules/list-order/infrastructure/ordered-page";
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

function partyWhereConditions(
  kind: PartyKind,
  filter: PartyListFilter
): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p."tenantId" = ${filter.tenantId}`,
    Prisma.sql`p.kind = ${kind}`,
  ];
  if (filter.status && filter.status !== "ALL") {
    conditions.push(Prisma.sql`p.status = ${filter.status}`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      p.name ILIKE ${pattern}
      OR COALESCE(p.email, '') ILIKE ${pattern}
      OR COALESCE(p.phone, '') ILIKE ${pattern}
      OR COALESCE(p.gstin, '') ILIKE ${pattern}
    )`);
  }
  return conditions;
}

export function createPrismaPartyRepository(
  client: Pick<PrismaClient, "party" | "$queryRaw">
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

    async listCustomersPage(filter) {
      return fetchOrderedPage({
        client,
        tenantId: filter.tenantId,
        listKey: "customers",
        fromSql: Prisma.sql`parties p`,
        idColumn: Prisma.sql`p.id`,
        whereConditions: partyWhereConditions("CUSTOMER", filter),
        defaultOrderSql: Prisma.sql`p.name ASC`,
        page: filter.page,
        pageSize: filter.pageSize,
        fetchByIds: async (ids) => {
          const records = await client.party.findMany({
            where: { tenantId: filter.tenantId, kind: "CUSTOMER", id: { in: ids } },
          });
          return records.map(asCustomer);
        },
        getId: (customer) => customer.id,
      });
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

    async reactivateCustomer(tenantId, customerId) {
      const result = await client.party.updateMany({
        where: {
          id: customerId,
          tenantId,
          kind: "CUSTOMER",
          status: "INACTIVE",
        },
        data: { status: "ACTIVE" },
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

    async listSuppliersPage(filter) {
      return fetchOrderedPage({
        client,
        tenantId: filter.tenantId,
        listKey: "suppliers",
        fromSql: Prisma.sql`parties p`,
        idColumn: Prisma.sql`p.id`,
        whereConditions: partyWhereConditions("SUPPLIER", filter),
        defaultOrderSql: Prisma.sql`p.name ASC`,
        page: filter.page,
        pageSize: filter.pageSize,
        fetchByIds: async (ids) => {
          const records = await client.party.findMany({
            where: { tenantId: filter.tenantId, kind: "SUPPLIER", id: { in: ids } },
          });
          return records.map(asSupplier);
        },
        getId: (supplier) => supplier.id,
      });
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
