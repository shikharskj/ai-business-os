import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  createCustomer,
  createSupplier,
  deactivateSupplier,
  getSupplier,
  listSuppliers,
  PartyInactiveError,
  PartyNotFoundError,
  PartyValidationError,
  updateSupplier,
} from "@/modules/party";
import { createMemoryPartyRepository } from "@/modules/party/infrastructure/repositories";
import type { SupplierInput } from "@/modules/party/domain/types";

function deps() {
  return {
    parties: createMemoryPartyRepository(),
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  };
}

const validSupplier: SupplierInput = {
  name: "XYZ Distributors",
  phone: "9876543210",
  email: "xyz@example.com",
  city: "Pune",
  state: "Maharashtra",
  gstRegistrationStatus: "REGISTERED",
  gstin: "27AABCU9603R1ZM",
};

describe("createSupplier", () => {
  it("creates a tenant-scoped active supplier and emits SupplierCreated", async () => {
    const { parties, audit, outbox } = deps();
    const supplier = await createSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validSupplier,
      parties,
      audit,
      outbox,
    });

    expect(supplier.kind).toBe("SUPPLIER");
    expect(supplier.status).toBe("ACTIVE");
    expect(supplier.tenantId).toBe("tenant-a");
    expect("outstanding" in supplier).toBe(false);
    expect(audit.records[0]?.action).toBe("supplier.created");
    expect(outbox.events[0]?.eventType).toBe("SupplierCreated");
  });

  it("rejects an invalid GSTIN", async () => {
    const { parties, audit, outbox } = deps();
    await expect(
      createSupplier({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: { ...validSupplier, gstin: "invalid" },
        parties,
        audit,
        outbox,
      })
    ).rejects.toBeInstanceOf(PartyValidationError);
  });
});

describe("getSupplier tenant isolation", () => {
  it("does not return another tenant's supplier by id", async () => {
    const { parties, audit, outbox } = deps();
    const created = await createSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validSupplier,
      parties,
      audit,
      outbox,
    });

    await expect(
      getSupplier({
        tenantId: "tenant-b",
        supplierId: created.id,
        parties,
      })
    ).rejects.toBeInstanceOf(PartyNotFoundError);
  });

  it("does not return a customer id as a supplier", async () => {
    const { parties, audit, outbox } = deps();
    const customer = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validSupplier,
      parties,
      audit,
      outbox,
    });

    await expect(
      getSupplier({
        tenantId: "tenant-a",
        supplierId: customer.id,
        parties,
      })
    ).rejects.toBeInstanceOf(PartyNotFoundError);
  });
});

describe("listSuppliers", () => {
  it("searches by name within the tenant only", async () => {
    const { parties, audit, outbox } = deps();
    await createSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validSupplier,
      parties,
      audit,
      outbox,
    });
    await createSupplier({
      tenantId: "tenant-b",
      actorUserId: "user-2",
      fields: { ...validSupplier, name: "XYZ Corp" },
      parties,
      audit,
      outbox,
    });

    const results = await listSuppliers({
      tenantId: "tenant-a",
      query: "xyz",
      parties,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("XYZ Distributors");
  });
});

describe("deactivateSupplier", () => {
  it("marks the supplier inactive", async () => {
    const { parties, audit, outbox } = deps();
    const created = await createSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validSupplier,
      parties,
      audit,
      outbox,
    });

    const deactivated = await deactivateSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      supplierId: created.id,
      parties,
      audit,
      outbox,
    });

    expect(deactivated.status).toBe("INACTIVE");
    expect(outbox.events.map((event) => event.eventType)).toContain(
      "SupplierDeactivated"
    );
  });

  it("rejects deactivating an already inactive supplier", async () => {
    const { parties, audit, outbox } = deps();
    const created = await createSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validSupplier,
      parties,
      audit,
      outbox,
    });
    await deactivateSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      supplierId: created.id,
      parties,
      audit,
      outbox,
    });

    await expect(
      deactivateSupplier({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        supplierId: created.id,
        parties,
        audit,
        outbox,
      })
    ).rejects.toBeInstanceOf(PartyInactiveError);
  });
});

describe("updateSupplier", () => {
  it("updates contact details for the owning tenant", async () => {
    const { parties, audit, outbox } = deps();
    const created = await createSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: validSupplier,
      parties,
      audit,
      outbox,
    });

    const updated = await updateSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      supplierId: created.id,
      fields: { ...validSupplier, phone: "9999999999" },
      parties,
      audit,
      outbox,
    });

    expect(updated.phone).toBe("9999999999");
    expect(outbox.events.map((event) => event.eventType)).toContain(
      "SupplierUpdated"
    );
  });
});
