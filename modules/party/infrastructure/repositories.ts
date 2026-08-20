import type {
  Customer,
  CustomerInput,
  Party,
  PartyKind,
  PartyStatus,
  Supplier,
  SupplierInput,
} from "@/modules/party/domain/types";
import type { ListPageParams, ListPageResult } from "@/modules/shared-kernel/list-page";
import { paginateArray } from "@/modules/shared-kernel/list-page";

export type PartyListFilter = {
  tenantId: string;
  query?: string;
  status?: PartyStatus | "ALL";
};

export type CustomerListFilter = PartyListFilter;
export type SupplierListFilter = PartyListFilter;

export type PartyRepository = {
  createCustomer(input: {
    tenantId: string;
    fields: CustomerInput;
  }): Promise<Customer>;
  updateCustomer(input: {
    tenantId: string;
    customerId: string;
    fields: CustomerInput;
  }): Promise<Customer | null>;
  findCustomerById(tenantId: string, customerId: string): Promise<Customer | null>;
  listCustomers(filter: CustomerListFilter): Promise<Customer[]>;
  listCustomersPage(
    filter: CustomerListFilter & ListPageParams
  ): Promise<ListPageResult<Customer>>;
  deactivateCustomer(
    tenantId: string,
    customerId: string
  ): Promise<Customer | null>;
  createSupplier(input: {
    tenantId: string;
    fields: SupplierInput;
  }): Promise<Supplier>;
  updateSupplier(input: {
    tenantId: string;
    supplierId: string;
    fields: SupplierInput;
  }): Promise<Supplier | null>;
  findSupplierById(tenantId: string, supplierId: string): Promise<Supplier | null>;
  listSuppliers(filter: SupplierListFilter): Promise<Supplier[]>;
  listSuppliersPage(
    filter: SupplierListFilter & ListPageParams
  ): Promise<ListPageResult<Supplier>>;
  deactivateSupplier(
    tenantId: string,
    supplierId: string
  ): Promise<Supplier | null>;
};

function asCustomer(record: Party): Customer {
  if (record.kind !== "CUSTOMER") {
    throw new Error("Expected a customer party.");
  }
  return { ...record, kind: "CUSTOMER" };
}

function asSupplier(record: Party): Supplier {
  if (record.kind !== "SUPPLIER") {
    throw new Error("Expected a supplier party.");
  }
  return { ...record, kind: "SUPPLIER" };
}

function matchesQuery(record: Party, query: string): boolean {
  if (!query) {
    return true;
  }
  return [record.name, record.email, record.phone, record.gstin]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query));
}

function partyFromInput(
  tenantId: string,
  kind: PartyKind,
  fields: CustomerInput | SupplierInput
): Party {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId,
    kind,
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
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

function applyFields(
  current: Party,
  fields: CustomerInput | SupplierInput
): Party {
  return {
    ...current,
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
    updatedAt: new Date(),
  };
}

export function createMemoryPartyRepository(
  initial: Party[] = []
): PartyRepository & { records: Party[] } {
  const records = [...initial];

  function findIndex(tenantId: string, id: string, kind: PartyKind) {
    return records.findIndex(
      (record) =>
        record.tenantId === tenantId && record.id === id && record.kind === kind
    );
  }

  function listKind(kind: PartyKind, filter: PartyListFilter) {
    const query = filter.query?.trim().toLowerCase() ?? "";
    return records
      .filter((record) => record.tenantId === filter.tenantId)
      .filter((record) => record.kind === kind)
      .filter((record) => {
        if (!filter.status || filter.status === "ALL") {
          return true;
        }
        return record.status === filter.status;
      })
      .filter((record) => matchesQuery(record, query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    records,
    async createCustomer(input) {
      const customer = asCustomer(
        partyFromInput(input.tenantId, "CUSTOMER", input.fields)
      );
      records.push(customer);
      return customer;
    },
    async updateCustomer(input) {
      const index = findIndex(input.tenantId, input.customerId, "CUSTOMER");
      if (index === -1) {
        return null;
      }
      const updated = asCustomer(applyFields(records[index]!, input.fields));
      records[index] = updated;
      return updated;
    },
    async findCustomerById(tenantId, customerId) {
      const record = records.find(
        (item) =>
          item.tenantId === tenantId &&
          item.id === customerId &&
          item.kind === "CUSTOMER"
      );
      return record ? asCustomer(record) : null;
    },
    async listCustomers(filter) {
      return listKind("CUSTOMER", filter).map(asCustomer);
    },
    async listCustomersPage(filter) {
      return paginateArray(await this.listCustomers(filter), filter.page, filter.pageSize);
    },
    async deactivateCustomer(tenantId, customerId) {
      const index = findIndex(tenantId, customerId, "CUSTOMER");
      if (index === -1) {
        return null;
      }
      const updated = asCustomer({
        ...records[index]!,
        status: "INACTIVE",
        updatedAt: new Date(),
      });
      records[index] = updated;
      return updated;
    },
    async createSupplier(input) {
      const supplier = asSupplier(
        partyFromInput(input.tenantId, "SUPPLIER", input.fields)
      );
      records.push(supplier);
      return supplier;
    },
    async updateSupplier(input) {
      const index = findIndex(input.tenantId, input.supplierId, "SUPPLIER");
      if (index === -1) {
        return null;
      }
      const updated = asSupplier(applyFields(records[index]!, input.fields));
      records[index] = updated;
      return updated;
    },
    async findSupplierById(tenantId, supplierId) {
      const record = records.find(
        (item) =>
          item.tenantId === tenantId &&
          item.id === supplierId &&
          item.kind === "SUPPLIER"
      );
      return record ? asSupplier(record) : null;
    },
    async listSuppliers(filter) {
      return listKind("SUPPLIER", filter).map(asSupplier);
    },
    async listSuppliersPage(filter) {
      return paginateArray(await this.listSuppliers(filter), filter.page, filter.pageSize);
    },
    async deactivateSupplier(tenantId, supplierId) {
      const index = findIndex(tenantId, supplierId, "SUPPLIER");
      if (index === -1) {
        return null;
      }
      const updated = asSupplier({
        ...records[index]!,
        status: "INACTIVE",
        updatedAt: new Date(),
      });
      records[index] = updated;
      return updated;
    },
  };
}
