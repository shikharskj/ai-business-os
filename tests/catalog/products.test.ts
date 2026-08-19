import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { money } from "@/modules/shared-kernel/money";
import {
  CatalogNotFoundError,
  CatalogSkuConflictError,
  CatalogValidationError,
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "@/modules/catalog";
import { createMemoryCatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import type { ProductInput } from "@/modules/catalog/domain/types";

function deps() {
  return {
    catalog: createMemoryCatalogRepository(),
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  };
}

const riceBag: ProductInput = {
  kind: "PRODUCT",
  name: "Basmati Rice 25kg",
  sku: "RICE-25",
  unitOfMeasurement: "KG",
  sellingPrice: money(250000n),
  purchasePrice: money(200000n),
  hsnSac: "10063010",
  taxRateBps: 500,
  category: "Groceries",
  tracksInventory: true,
};

describe("createProduct", () => {
  it("creates a tenant-scoped product with decimal money prices", async () => {
    const { catalog, audit, outbox } = deps();
    const product = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: riceBag,
      catalog,
      audit,
      outbox,
    });

    expect(product.tenantId).toBe("tenant-a");
    expect(product.sku).toBe("RICE-25");
    expect(product.sellingPrice.amountMinor).toBe(250000n);
    expect(typeof product.sellingPrice.amountMinor).toBe("bigint");
    expect(product.tracksInventory).toBe(true);
    expect(audit.records[0]?.action).toBe("product.created");
    expect(outbox.events[0]?.eventType).toBe("ProductCreated");
  });

  it("rejects a duplicate SKU in the same tenant", async () => {
    const { catalog, audit, outbox } = deps();
    await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: riceBag,
      catalog,
      audit,
      outbox,
    });

    await expect(
      createProduct({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: { ...riceBag, name: "Other rice" },
        catalog,
        audit,
        outbox,
      })
    ).rejects.toBeInstanceOf(CatalogSkuConflictError);
  });

  it("allows the same SKU in another tenant", async () => {
    const { catalog, audit, outbox } = deps();
    await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: riceBag,
      catalog,
      audit,
      outbox,
    });

    const other = await createProduct({
      tenantId: "tenant-b",
      actorUserId: "user-2",
      fields: riceBag,
      catalog,
      audit,
      outbox,
    });
    expect(other.tenantId).toBe("tenant-b");
  });

  it("does not track inventory for services", async () => {
    const { catalog, audit, outbox } = deps();
    const product = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        ...riceBag,
        kind: "SERVICE",
        name: "Installation",
        sku: "INST-1",
        unitOfMeasurement: "HR",
        tracksInventory: true,
      },
      catalog,
      audit,
      outbox,
    });
    expect(product.tracksInventory).toBe(false);
  });

  it("rejects an invalid GST rate", async () => {
    const { catalog, audit, outbox } = deps();
    await expect(
      createProduct({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: { ...riceBag, taxRateBps: 700 },
        catalog,
        audit,
        outbox,
      })
    ).rejects.toBeInstanceOf(CatalogValidationError);
  });
});

describe("getProduct tenant isolation", () => {
  it("does not return another tenant's product by id", async () => {
    const { catalog, audit, outbox } = deps();
    const created = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: riceBag,
      catalog,
      audit,
      outbox,
    });

    await expect(
      getProduct({
        tenantId: "tenant-b",
        productId: created.id,
        catalog,
      })
    ).rejects.toBeInstanceOf(CatalogNotFoundError);
  });
});

describe("listProducts", () => {
  it("searches by name within the tenant only", async () => {
    const { catalog, audit, outbox } = deps();
    await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: riceBag,
      catalog,
      audit,
      outbox,
    });
    await createProduct({
      tenantId: "tenant-b",
      actorUserId: "user-2",
      fields: { ...riceBag, name: "Wheat flour", sku: "WHEAT-1" },
      catalog,
      audit,
      outbox,
    });

    const results = await listProducts({
      tenantId: "tenant-a",
      query: "rice",
      catalog,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Basmati Rice 25kg");
  });
});

describe("updateProduct", () => {
  it("updates prices for the owning tenant", async () => {
    const { catalog, audit, outbox } = deps();
    const created = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: riceBag,
      catalog,
      audit,
      outbox,
    });

    const updated = await updateProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: created.id,
      fields: { ...riceBag, sellingPrice: money(275000n) },
      catalog,
      audit,
      outbox,
    });

    expect(updated.sellingPrice.amountMinor).toBe(275000n);
    expect(outbox.events.map((event) => event.eventType)).toContain(
      "ProductUpdated"
    );
  });
});
