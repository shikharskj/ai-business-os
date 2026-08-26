import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type { DomainEventType } from "@/modules/events/catalog";
import type { CatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import type { Product } from "@/modules/catalog/domain/types";
import {
  InventoryNotTrackedError,
  InventoryOpeningExistsError,
  InventoryProductNotFoundError,
  InventoryValidationError,
} from "@/modules/inventory/domain/errors";
import { isLowStock, quantityFromMovements } from "@/modules/inventory/domain/stock";
import type {
  InventoryMovement,
  InventoryMovementCause,
  InventoryMovementDirection,
  RecordInventoryMovementInput,
  StockPosition,
} from "@/modules/inventory/domain/types";
import {
  compareQuantity,
  DEFAULT_LOW_STOCK_THRESHOLD,
  isPositiveQuantity,
  quantity,
  quantityFromMajor,
  type Quantity,
  ZERO_QUANTITY,
} from "@/modules/inventory/domain/quantity";
import type { InventoryRepository } from "@/modules/inventory/infrastructure/repositories";
import type { BusinessDate } from "@/modules/shared-kernel/dates";

export type InventoryUseCaseDeps = {
  tenantId: string;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
};

async function requireTrackedProduct(input: {
  tenantId: string;
  productId: string;
  catalog: CatalogRepository;
}): Promise<Product> {
  const product = await input.catalog.findProductById(
    input.tenantId,
    input.productId
  );
  if (!product) {
    throw new InventoryProductNotFoundError();
  }
  if (!product.tracksInventory) {
    throw new InventoryNotTrackedError();
  }
  return product;
}

/**
 * Application interface for later sale stock-out and purchase stock-in.
 * Sales and purchases must call this instead of writing movement tables.
 */
export async function recordInventoryMovement(input: {
  tenantId: string;
  actorUserId: string;
  movement: RecordInventoryMovementInput;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<InventoryMovement> {
  if (!isPositiveQuantity(input.movement.quantity)) {
    throw new InventoryValidationError("Quantity must be greater than zero.");
  }

  await requireTrackedProduct({
    tenantId: input.tenantId,
    productId: input.movement.productId,
    catalog: input.catalog,
  });

  const existing = await input.inventory.findByIdempotencyKey(
    input.tenantId,
    input.movement.idempotencyKey
  );
  if (existing) {
    return existing;
  }

  if (input.movement.cause === "OPENING") {
    const opening = await input.inventory.findOpeningMovement(
      input.tenantId,
      input.movement.productId
    );
    if (opening) {
      throw new InventoryOpeningExistsError();
    }
    if (input.movement.direction !== "IN") {
      throw new InventoryValidationError("Opening stock must increase quantity.");
    }
  }

  if (input.movement.direction === "OUT") {
    await input.inventory.lockProductForUpdate(
      input.tenantId,
      input.movement.productId
    );
    const onHand = await input.inventory.sumQuantitiesByProduct(input.tenantId, [
      input.movement.productId,
    ]);
    const current = onHand.get(input.movement.productId)?.quantity ?? 0n;
    if (current - input.movement.quantity.amountMinor < 0n) {
      throw new InventoryValidationError(
        "Insufficient stock. On-hand quantity cannot go below zero."
      );
    }
  }

  let movement;
  try {
    movement = await input.inventory.appendMovement({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      movement: {
        ...input.movement,
        reason: input.movement.reason ?? null,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const retry = await input.inventory.findByIdempotencyKey(
        input.tenantId,
        input.movement.idempotencyKey
      );
      if (retry) {
        return retry;
      }
      if (input.movement.cause === "OPENING") {
        throw new InventoryOpeningExistsError();
      }
    }
    throw error;
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: auditActionForCause(input.movement.cause),
    resource: "inventory",
    resourceId: movement.productId,
    metadata: {
      movementId: movement.id,
      cause: movement.cause,
      direction: movement.direction,
      quantity: movement.quantity.amountMinor.toString(),
      sourceType: movement.sourceType,
      sourceId: movement.sourceId,
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: eventTypeForCause(input.movement.cause),
    aggregateType: "Inventory",
    aggregateId: movement.productId,
    payload: {
      movementId: movement.id,
      cause: movement.cause,
      direction: movement.direction,
      sourceType: movement.sourceType,
      sourceId: movement.sourceId,
    },
  });

  return movement;
}

/**
 * Opening stock is recorded as an inventory movement only.
 * Balanced accounting for opening inventory (Dr Inventory / Cr Capital)
 * is deferred to sales/purchase posting in specs 16 and 19 so valuation
 * and journals stay in the same transaction as those documents.
 */
export async function recordOpeningStock(input: {
  tenantId: string;
  actorUserId: string;
  productId: string;
  quantity: Quantity;
  occurredOn: BusinessDate;
  reason?: string | null;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<InventoryMovement> {
  return recordInventoryMovement({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    catalog: input.catalog,
    inventory: input.inventory,
    audit: input.audit,
    outbox: input.outbox,
    movement: {
      productId: input.productId,
      cause: "OPENING",
      direction: "IN",
      quantity: input.quantity,
      occurredOn: input.occurredOn,
      sourceType: "OPENING",
      sourceId: input.productId,
      idempotencyKey: `opening:${input.productId}`,
      reason: input.reason ?? "Opening stock",
    },
  });
}

export async function recordStockAdjustment(input: {
  tenantId: string;
  actorUserId: string;
  productId: string;
  direction: InventoryMovementDirection;
  quantity: Quantity;
  occurredOn: BusinessDate;
  reason: string;
  idempotencyKey: string;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<InventoryMovement> {
  const reason = input.reason.trim();
  if (reason.length < 2) {
    throw new InventoryValidationError("Explain why this adjustment is needed.");
  }

  return recordInventoryMovement({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    catalog: input.catalog,
    inventory: input.inventory,
    audit: input.audit,
    outbox: input.outbox,
    movement: {
      productId: input.productId,
      cause: "ADJUSTMENT",
      direction: input.direction,
      quantity: input.quantity,
      occurredOn: input.occurredOn,
      sourceType: "ADJUSTMENT",
      sourceId: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      reason,
    },
  });
}

export async function getStockPosition(input: {
  tenantId: string;
  productId: string;
  lowStockThreshold?: Quantity;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
}): Promise<StockPosition> {
  const product = await input.catalog.findProductById(
    input.tenantId,
    input.productId
  );
  if (!product) {
    throw new InventoryProductNotFoundError();
  }

  const threshold = input.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  return toStockPosition({
    product,
    movements: product.tracksInventory
      ? await input.inventory.listMovements(input.tenantId, product.id)
      : [],
    threshold,
  });
}

export async function buildStockPositionsForProductIds(input: {
  tenantId: string;
  productIds: string[];
  lowStockThreshold?: Quantity;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
}): Promise<StockPosition[]> {
  const threshold = input.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  if (input.productIds.length === 0) {
    return [];
  }

  const products = await Promise.all(
    input.productIds.map((productId) =>
      input.catalog.findProductById(input.tenantId, productId)
    )
  );
  const tracked = products.filter(
    (product): product is NonNullable<typeof product> =>
      product !== null && product.tracksInventory
  );
  const aggregates = await input.inventory.sumQuantitiesByProduct(
    input.tenantId,
    tracked.map((product) => product.id)
  );

  return tracked.map((product) => {
    const aggregate = aggregates.get(product.id) ?? {
      quantity: 0n,
      hasMovements: false,
    };
    return toStockPositionFromAggregate({
      product,
      quantity: quantity(aggregate.quantity),
      hasMovements: aggregate.hasMovements,
      threshold,
    });
  });
}

export async function listStockPositions(input: {
  tenantId: string;
  query?: string;
  lowStockOnly?: boolean;
  lowStockThreshold?: Quantity;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
}): Promise<StockPosition[]> {
  const threshold = input.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const products = await input.catalog.listProducts({
    tenantId: input.tenantId,
    query: input.query,
  });
  const tracked = products.filter((product) => product.tracksInventory);
  const trackedIds = tracked.map((p) => p.id);
  const aggregates = await input.inventory.sumQuantitiesByProduct(
    input.tenantId,
    trackedIds
  );

  const positions = tracked.map((product) => {
    const aggregate = aggregates.get(product.id) ?? {
      quantity: 0n,
      hasMovements: false,
    };
    return toStockPositionFromAggregate({
      product,
      quantity: quantity(aggregate.quantity),
      hasMovements: aggregate.hasMovements,
      threshold,
    });
  });

  if (input.lowStockOnly) {
    return positions.filter((position) => position.isLowStock);
  }
  return positions;
}

export async function listLowStockProducts(input: {
  tenantId: string;
  lowStockThreshold?: Quantity;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
}): Promise<StockPosition[]> {
  return listStockPositions({
    ...input,
    lowStockOnly: true,
  });
}

export async function listStockMovements(input: {
  tenantId: string;
  productId: string;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
}): Promise<InventoryMovement[]> {
  await requireTrackedProduct({
    tenantId: input.tenantId,
    productId: input.productId,
    catalog: input.catalog,
  });
  return input.inventory.listMovements(input.tenantId, input.productId);
}

export function parseLowStockThreshold(value: string | undefined | null): Quantity {
  if (!value) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
  const parsed = quantityFromMajor(value);
  if (compareQuantity(parsed, ZERO_QUANTITY) < 0) {
    throw new InventoryValidationError("Low-stock threshold cannot be negative.");
  }
  return parsed;
}

function toStockPosition(input: {
  product: Product;
  movements: InventoryMovement[];
  threshold: Quantity;
}): StockPosition {
  if (!input.product.tracksInventory) {
    return {
      tenantId: input.product.tenantId,
      productId: input.product.id,
      productName: input.product.name,
      sku: input.product.sku,
      unitOfMeasurement: input.product.unitOfMeasurement,
      tracksInventory: false,
      quantity: null,
      hasMovements: false,
      isLowStock: false,
    };
  }

  const quantity = quantityFromMovements(input.movements);
  return {
    tenantId: input.product.tenantId,
    productId: input.product.id,
    productName: input.product.name,
    sku: input.product.sku,
    unitOfMeasurement: input.product.unitOfMeasurement,
    tracksInventory: true,
    quantity,
    hasMovements: input.movements.length > 0,
    isLowStock: isLowStock(quantity, input.threshold),
  };
}

function toStockPositionFromAggregate(input: {
  product: Product;
  quantity: Quantity;
  hasMovements: boolean;
  threshold: Quantity;
}): StockPosition {
  if (!input.product.tracksInventory) {
    return {
      tenantId: input.product.tenantId,
      productId: input.product.id,
      productName: input.product.name,
      sku: input.product.sku,
      unitOfMeasurement: input.product.unitOfMeasurement,
      tracksInventory: false,
      quantity: null,
      hasMovements: false,
      isLowStock: false,
    };
  }

  return {
    tenantId: input.product.tenantId,
    productId: input.product.id,
    productName: input.product.name,
    sku: input.product.sku,
    unitOfMeasurement: input.product.unitOfMeasurement,
    tracksInventory: true,
    quantity: input.quantity,
    hasMovements: input.hasMovements,
    isLowStock: isLowStock(input.quantity, input.threshold),
  };
}

function auditActionForCause(cause: InventoryMovementCause): string {
  if (cause === "OPENING") return "inventory.opening";
  if (cause === "ADJUSTMENT") return "inventory.adjusted";
  return "inventory.moved";
}

function eventTypeForCause(cause: InventoryMovementCause): DomainEventType {
  if (cause === "OPENING") return "InventoryOpened";
  if (cause === "ADJUSTMENT") return "InventoryAdjusted";
  return "InventoryMoved";
}
