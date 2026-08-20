export type {
  InventoryMovement,
  InventoryMovementCause,
  InventoryMovementDirection,
  RecordInventoryMovementInput,
  StockPosition,
} from "@/modules/inventory/domain/types";
export {
  INVENTORY_MOVEMENT_CAUSES,
  INVENTORY_MOVEMENT_DIRECTIONS,
} from "@/modules/inventory/domain/types";
export {
  InventoryError,
  InventoryNotTrackedError,
  InventoryOpeningExistsError,
  InventoryProductNotFoundError,
  InventoryValidationError,
} from "@/modules/inventory/domain/errors";
export {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_LOW_STOCK_THRESHOLD_MAJOR,
  formatQuantity,
  quantity,
  quantityFromMajor,
  quantityFromPrismaDecimal,
  toQuantityMajorString,
  type Quantity,
  ZERO_QUANTITY,
} from "@/modules/inventory/domain/quantity";
export { isLowStock, quantityFromMovements } from "@/modules/inventory/domain/stock";
export {
  getStockPosition,
  listLowStockProducts,
  listStockMovements,
  listStockPositions,
  parseLowStockThreshold,
  recordInventoryMovement,
  recordOpeningStock,
  recordStockAdjustment,
} from "@/modules/inventory/application/stock";
export {
  createMemoryInventoryRepository,
  type InventoryRepository,
} from "@/modules/inventory/infrastructure/repositories";
export {
  adjustStockInputSchema,
  openingStockInputSchema,
  stockSearchSchema,
} from "@/modules/inventory/schemas/inventory.schema";
