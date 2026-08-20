export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

export class InventoryProductNotFoundError extends InventoryError {
  constructor() {
    super("Product was not found.");
    this.name = "InventoryProductNotFoundError";
  }
}

export class InventoryNotTrackedError extends InventoryError {
  constructor() {
    super("Stock is not tracked for this item.");
    this.name = "InventoryNotTrackedError";
  }
}

export class InventoryValidationError extends InventoryError {
  constructor(message: string) {
    super(message);
    this.name = "InventoryValidationError";
  }
}

export class InventoryOpeningExistsError extends InventoryError {
  constructor() {
    super("Opening stock has already been recorded for this product.");
    this.name = "InventoryOpeningExistsError";
  }
}
