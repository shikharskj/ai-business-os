import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  createCustomer,
  deactivateCustomer,
  getCustomer,
  listCustomers,
  PartyInactiveError,
  PartyNotFoundError,
  PartyValidationError,
  updateCustomer,
} from "@/modules/party";
import { createMemoryPartyRepository } from "@/modules/party/infrastructure/repositories";
import type { CustomerInput } from "@/modules/party/domain/types";

function deps() {
  return {
    parties: createMemoryPartyRepository(),
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  };
}

const validCustomer: CustomerInput = {
  name: "ABC Traders",
  phone: "9876543210",
  email: "abc@example.com",
  city: "Mumbai",
  state: "Maharashtra",
  gstRegistrationStatus: "REGISTERED",
  gstin: "27AABCU9603R1ZM",
};

describe("createCustomer", () => {
  it("creates a tenant-scoped active customer and audits the create", async () => {
    const { parties, audit, outbox } = deps();
    const customer = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validCustomer,
      parties,
      audit,
      outbox,
    });

    expect(customer.kind).toBe("CUSTOMER");
    expect(customer.status).toBe("ACTIVE");
    expect(customer.tenantId).toBe("tenant-a");
    expect(customer.gstin).toBe("27AABCU9603R1ZM");
    expect("outstanding" in customer).toBe(false);
    expect(audit.records[0]?.action).toBe("customer.created");
    expect(outbox.events[0]?.eventType).toBe("CustomerCreated");
  });

  it("rejects an invalid GSTIN", async () => {
    const { parties, audit, outbox } = deps();
    await expect(
      createCustomer({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: { ...validCustomer, gstin: "invalid" },
        parties,
        audit,
        outbox,
      })
    ).rejects.toBeInstanceOf(PartyValidationError);
  });
});

describe("getCustomer tenant isolation", () => {
  it("does not return another tenant's customer by id", async () => {
    const { parties, audit, outbox } = deps();
    const created = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validCustomer,
      parties,
      audit,
      outbox,
    });

    await expect(
      getCustomer({
        tenantId: "tenant-b",
        customerId: created.id,
        parties,
      })
    ).rejects.toBeInstanceOf(PartyNotFoundError);
  });
});

describe("listCustomers", () => {
  it("searches by name within the tenant only", async () => {
    const { parties, audit, outbox } = deps();
    await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validCustomer,
      parties,
      audit,
      outbox,
    });
    await createCustomer({
      tenantId: "tenant-b",
      actorUserId: "user-2",
      fields: { ...validCustomer, name: "XYZ Store" },
      parties,
      audit,
      outbox,
    });

    const results = await listCustomers({
      tenantId: "tenant-a",
      query: "abc",
      parties,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("ABC Traders");
  });
});

describe("deactivateCustomer", () => {
  it("marks the customer inactive and writes audit plus outbox events", async () => {
    const { parties, audit, outbox } = deps();
    const created = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validCustomer,
      parties,
      audit,
      outbox,
    });

    const deactivated = await deactivateCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      customerId: created.id,
      parties,
      audit,
      outbox,
    });

    expect(deactivated.status).toBe("INACTIVE");
    expect(outbox.events.map((event) => event.eventType)).toContain(
      "CustomerDeactivated"
    );
  });

  it("rejects deactivating an already inactive customer", async () => {
    const { parties, audit, outbox } = deps();
    const created = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validCustomer,
      parties,
      audit,
      outbox,
    });
    await deactivateCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      customerId: created.id,
      parties,
      audit,
      outbox,
    });

    await expect(
      deactivateCustomer({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        customerId: created.id,
        parties,
        audit,
        outbox,
      })
    ).rejects.toBeInstanceOf(PartyInactiveError);
  });
});

describe("updateCustomer", () => {
  it("updates contact details for the owning tenant", async () => {
    const { parties, audit, outbox } = deps();
    const created = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validCustomer,
      parties,
      audit,
      outbox,
    });

    const updated = await updateCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      customerId: created.id,
      fields: { ...validCustomer, phone: "9999999999" },
      parties,
      audit,
      outbox,
    });

    expect(updated.phone).toBe("9999999999");
    expect(outbox.events.map((event) => event.eventType)).toContain(
      "CustomerUpdated"
    );
  });
});
