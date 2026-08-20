export class SalesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesError";
  }
}

export class QuotationNotFoundError extends SalesError {
  constructor() {
    super("Quotation was not found.");
    this.name = "QuotationNotFoundError";
  }
}

export class QuotationValidationError extends SalesError {
  constructor(message: string) {
    super(message);
    this.name = "QuotationValidationError";
  }
}

export class QuotationStatusError extends SalesError {
  constructor(message: string) {
    super(message);
    this.name = "QuotationStatusError";
  }
}

export class QuotationConversionNotReadyError extends SalesError {
  constructor() {
    super(
      "Converting a quotation to an invoice is not available yet. Sales invoices will enable this."
    );
    this.name = "QuotationConversionNotReadyError";
  }
}
