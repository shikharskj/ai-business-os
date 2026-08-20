import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import { createMemoryCatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import { createProduct } from "@/modules/catalog";
import type { ProductInput } from "@/modules/catalog/domain/types";
import {
  InventoryNotTrackedError,
  InventoryOpeningExistsError,
  InventoryProductNotFoundError,
  InventoryValidationError,
  createMemoryInventoryRepository,
  formatQuantity,
  getStockPosition,
  listLowStockProducts,
  listStockMovements,
  listStockPositions,
  quantityFromMajor,
  quantityFromMovements,
  recordInventoryMovement,
  recordOpeningStock,
  recordStockAdjustment,
} from "@/modules/inventory";
import * as inventoryModule from "@/modules/inventory";

function deps() {
  return {
    catalog: createMemoryCatalogRepository(),
    inventory: createMemoryInventoryRepository(),
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

async function createTrackedProduct(
  catalog: ReturnType<typeof createMemoryCatalogRepository>,
  tenantId = "tenant-a"
) {
  return createProduct({
    tenantId,
    actorUserId: "user-1",
    fields: riceBag,
    catalog,
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  });
}

describe("opening stock and adjustments", () => {
  it("changes derived quantity through movements only", async () => {
    const { catalog, inventory, audit, outbox } = deps();
    const product = await createTrackedProduct(catalog);

    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("10"),
      occurredOn: businessDate("2026-04-01"),
      catalog,
      inventory,
      audit,
      outbox,
    });

    await recordStockAdjustment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      direction: "OUT",
      quantity: quantityFromMajor("2.5"),
      occurredOn: businessDate("2026-04-02"),
      reason: "Damaged bags written off",
      catalog,
      inventory,
      audit,
      outbox,
    });

    const position = await getStockPosition({
      tenantId: "tenant-a",
      productId: product.id,
      catalog,
      inventory,
    });
    const movements = await listStockMovements({
      tenantId: "tenant-a",
      productId: product.id,
      catalog,
      inventory,
    });

    expect(formatQuantity(position.quantity!)).toBe("7.5");
    expect(position.hasMovements).toBe(true);
    expect(quantityFromMovements(movements).amountMinor).toBe(
      position.quantity!.amountMinor
    );
    expect(inventory.movements).toHaveLength(2);
    expect(audit.records.map((record) => record.action)).toEqual([
      "inventory.opening",
      "inventory.adjusted",
    ]);
    expect(outbox.events.map((event) => event.eventType)).toEqual([
      "InventoryOpened",
      "InventoryAdjusted",
    ]);
  });

  it("does not expose a public use case that sets stock without a movement", () => {
    expect(inventoryModule).not.toHaveProperty("setStock");
    expect(inventoryModule).not.toHaveProperty("updateStockBalance");
    expect(inventoryModule).not.toHaveProperty("setQuantity");
  });

  it("rejects a second opening stock movement with a different key", async () => {
    const { catalog, inventory, audit, outbox } = deps();
    const product = await createTrackedProduct(catalog);

    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("10"),
      occurredOn: businessDate("2026-04-01"),
      catalog,
      inventory,
      audit,
      outbox,
    });

    await expect(
      recordInventoryMovement({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        catalog,
        inventory,
        audit,
        outbox,
        movement: {
          productId: product.id,
          cause: "OPENING",
          direction: "IN",
          quantity: quantityFromMajor("4"),
          occurredOn: businessDate("2026-04-02"),
          sourceType: "OPENING",
          sourceId: `${product.id}-again`,
          idempotencyKey: `opening-retry:${product.id}`,
        },
      })
    ).rejects.toBeInstanceOf(InventoryOpeningExistsError);
  });

  it("replays the same opening idempotently", async () => {
    const { catalog, inventory, audit, outbox } = deps();
    const product = await createTrackedProduct(catalog);
    const first = await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("10"),
      occurredOn: businessDate("2026-04-01"),
      catalog,
      inventory,
      audit,
      outbox,
    });

    const replay = await recordInventoryMovement({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      catalog,
      inventory,
      audit,
      outbox,
      movement: {
        productId: product.id,
        cause: "OPENING",
        direction: "IN",
        quantity: quantityFromMajor("10"),
        occurredOn: businessDate("2026-04-01"),
        sourceType: "OPENING",
        sourceId: product.id,
        idempotencyKey: `opening:${product.id}`,
      },
    });

    expect(replay.id).toBe(first.id);
    expect(inventory.movements).toHaveLength(1);
  });

  it("rejects untracked products and services", async () => {
    const { catalog, inventory, audit, outbox } = deps();
    const service = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        ...riceBag,
        kind: "SERVICE",
        name: "Delivery",
        sku: "DEL-1",
        unitOfMeasurement: "HR",
        tracksInventory: true,
      },
      catalog,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });

    await expect(
      recordOpeningStock({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        productId: service.id,
        quantity: quantityFromMajor("1"),
        occurredOn: businessDate("2026-04-01"),
        catalog,
        inventory,
        audit,
        outbox,
      })
    ).rejects.toBeInstanceOf(InventoryNotTrackedError);
  });

  it("rejects a zero adjustment quantity", async () => {
    const { catalog, inventory, audit, outbox } = deps();
    const product = await createTrackedProduct(catalog);

    await expect(
      recordStockAdjustment({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        productId: product.id,
        direction: "IN",
        quantity: quantityFromMajor("0"),
        occurredOn: businessDate("2026-04-01"),
        reason: "Count correction",
        catalog,
        inventory,
        audit,
        outbox,
      })
    ).rejects.toBeInstanceOf(InventoryValidationError);
  });
});

describe("low-stock detection", () => {
  it("lists tracked products at or below the tenant threshold", async () => {
    const { catalog, inventory, audit, outbox } = deps();
    const rice = await createTrackedProduct(catalog);
    const wheat = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: { ...riceBag, name: "Wheat flour", sku: "WHEAT-1" },
      catalog,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });

    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: rice.id,
      quantity: quantityFromMajor("3"),
      occurredOn: businessDate("2026-04-01"),
      catalog,
      inventory,
      audit,
      outbox,
    });
    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: wheat.id,
      quantity: quantityFromMajor("12"),
      occurredOn: businessDate("2026-04-01"),
      catalog,
      inventory,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });

    const low = await listLowStockProducts({
      tenantId: "tenant-a",
      lowStockThreshold: quantityFromMajor("5"),
      catalog,
      inventory,
    });

    expect(low.map((item) => item.sku)).toEqual(["RICE-25"]);
    expect(low[0]?.isLowStock).toBe(true);
  });

  it("treats tracked products with no movements as low stock at quantity 0", async () => {
    const { catalog, inventory } = deps();
    await createTrackedProduct(catalog);

    const positions = await listStockPositions({
      tenantId: "tenant-a",
      catalog,
      inventory,
      lowStockThreshold: quantityFromMajor("5"),
    });

    expect(positions).toHaveLength(1);
    expect(formatQuantity(positions[0]!.quantity!)).toBe("0");
    expect(positions[0]?.hasMovements).toBe(false);
    expect(positions[0]?.isLowStock).toBe(true);
  });
});

describe("tenant isolation", () => {
  it("rejects cross-tenant stock access by product id", async () => {
    const { catalog, inventory, audit, outbox } = deps();
    const product = await createTrackedProduct(catalog);
    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("10"),
      occurredOn: businessDate("2026-04-01"),
      catalog,
      inventory,
      audit,
      outbox,
    });

    await expect(
      getStockPosition({
        tenantId: "tenant-b",
        productId: product.id,
        catalog,
        inventory,
      })
    ).rejects.toBeInstanceOf(InventoryProductNotFoundError);

    const otherTenant = await listStockPositions({
      tenantId: "tenant-b",
      catalog,
      inventory,
    });
    expect(otherTenant).toHaveLength(0);
  });
});

describe("sale and purchase interface", () => {
  it("applies later stock-in and stock-out through the same movement API", async () => {
    const { catalog, inventory, audit, outbox } = deps();
    const product = await createTrackedProduct(catalog);

    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("20"),
      occurredOn: businessDate("2026-04-01"),
      catalog,
      inventory,
      audit,
      outbox,
    });

    await recordInventoryMovement({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      catalog,
      inventory,
      audit,
      outbox,
      movement: {
        productId: product.id,
        cause: "PURCHASE",
        direction: "IN",
        quantity: quantityFromMajor("5"),
        occurredOn: businessDate("2026-04-03"),
        sourceType: "PURCHASE",
        sourceId: "bill-1",
        idempotencyKey: "purchase:bill-1:line-1",
      },
    });

    await recordInventoryMovement({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      catalog,
      inventory,
      audit,
      outbox,
      movement: {
        productId: product.id,
        cause: "SALE",
        direction: "OUT",
        quantity: quantityFromMajor("8"),
        occurredOn: businessDate("2026-04-04"),
        sourceType: "SALE",
        sourceId: "inv-1",
        idempotencyKey: "sale:inv-1:line-1",
      },
    });

    const position = await getStockPosition({
      tenantId: "tenant-a",
      productId: product.id,
      catalog,
      inventory,
    });
    expect(formatQuantity(position.quantity!)).toBe("17");
  });
});
