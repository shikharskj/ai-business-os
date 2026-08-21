export class AttentionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttentionError";
  }
}

export class AttentionItemNotFoundError extends AttentionError {
  constructor() {
    super("Attention item not found.");
    this.name = "AttentionItemNotFoundError";
  }
}

export class AttentionTenantMismatchError extends AttentionError {
  constructor() {
    super("Cross-tenant attention access rejected");
    this.name = "AttentionTenantMismatchError";
  }
}
