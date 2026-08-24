export class PurchaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseError";
  }
}

export class PurchaseNotFoundError extends PurchaseError {
  constructor() {
    super("Purchase bill was not found.");
    this.name = "PurchaseNotFoundError";
  }
}

export class PurchaseValidationError extends PurchaseError {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseValidationError";
  }
}

export class PurchaseStatusError extends PurchaseError {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseStatusError";
  }
}

export class PurchaseAlreadyPostedError extends PurchaseError {
  constructor() {
    super("This purchase bill has already been posted.");
    this.name = "PurchaseAlreadyPostedError";
  }
}

export class PurchaseReturnNotFoundError extends PurchaseError {
  constructor() {
    super("Purchase return was not found.");
    this.name = "PurchaseReturnNotFoundError";
  }
}

export class PurchaseReturnValidationError extends PurchaseError {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseReturnValidationError";
  }
}

export class PurchaseReturnStatusError extends PurchaseError {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseReturnStatusError";
  }
}

export class PurchaseReturnAlreadyPostedError extends PurchaseError {
  constructor() {
    super("This purchase return has already been posted.");
    this.name = "PurchaseReturnAlreadyPostedError";
  }
}
