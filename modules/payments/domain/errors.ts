export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor() {
    super("Payment was not found.");
    this.name = "PaymentNotFoundError";
  }
}

export class PaymentValidationError extends PaymentError {
  constructor(message: string) {
    super(message);
    this.name = "PaymentValidationError";
  }
}

export class AllocationExceedsOutstandingError extends PaymentError {
  constructor() {
    super("Allocation cannot exceed the invoice outstanding amount.");
    this.name = "AllocationExceedsOutstandingError";
  }
}

export class AllocationExceedsPaymentError extends PaymentError {
  constructor() {
    super("Allocation cannot exceed the payment amount.");
    this.name = "AllocationExceedsPaymentError";
  }
}
