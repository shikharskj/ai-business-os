export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogError";
  }
}

export class CatalogNotFoundError extends CatalogError {
  constructor() {
    super("Product was not found.");
    this.name = "CatalogNotFoundError";
  }
}

export class CatalogValidationError extends CatalogError {
  constructor(message: string) {
    super(message);
    this.name = "CatalogValidationError";
  }
}

export class CatalogSkuConflictError extends CatalogError {
  constructor() {
    super("A product with this SKU already exists in this business.");
    this.name = "CatalogSkuConflictError";
  }
}
