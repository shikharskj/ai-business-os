import type { Customer, CustomerInput, PartyStatus } from "@/modules/party/domain/types";

export type CustomerListFilter = {
  tenantId: string;
  query?: string;
  status?: PartyStatus | "ALL";
};

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
  deactivateCustomer(
    tenantId: string,
    customerId: string
  ): Promise<Customer | null>;
};

export function createMemoryPartyRepository(
  initial: Customer[] = []
): PartyRepository & { records: Customer[] } {
  const records = [...initial];

  return {
    records,
    async createCustomer(input) {
      const now = new Date();
      const customer: Customer = {
        id: crypto.randomUUID(),
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
        createdAt: now,
        updatedAt: now,
      };
      records.push(customer);
      return customer;
    },
    async updateCustomer(input) {
      const index = records.findIndex(
        (record) =>
          record.tenantId === input.tenantId && record.id === input.customerId
      );
      if (index === -1) {
        return null;
      }
      const current = records[index]!;
      const updated: Customer = {
        ...current,
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
        updatedAt: new Date(),
      };
      records[index] = updated;
      return updated;
    },
    async findCustomerById(tenantId, customerId) {
      return (
        records.find(
          (record) => record.tenantId === tenantId && record.id === customerId
        ) ?? null
      );
    },
    async listCustomers(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      return records
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (!filter.status || filter.status === "ALL") {
            return true;
          }
          return record.status === filter.status;
        })
        .filter((record) => {
          if (!query) {
            return true;
          }
          return [record.name, record.email, record.phone, record.gstin]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query));
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async deactivateCustomer(tenantId, customerId) {
      const index = records.findIndex(
        (record) => record.tenantId === tenantId && record.id === customerId
      );
      if (index === -1) {
        return null;
      }
      const current = records[index]!;
      const updated: Customer = {
        ...current,
        status: "INACTIVE",
        updatedAt: new Date(),
      };
      records[index] = updated;
      return updated;
    },
  };
}
