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

export class InvoiceNotFoundError extends SalesError {
  constructor() {
    super("Invoice was not found.");
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceValidationError extends SalesError {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceValidationError";
  }
}

export class InvoiceStatusError extends SalesError {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceStatusError";
  }
}

export class InvoiceAlreadyPostedError extends SalesError {
  constructor() {
    super("This invoice has already been posted.");
    this.name = "InvoiceAlreadyPostedError";
  }
}

export class QuotationAlreadyConvertedError extends SalesError {
  constructor() {
    super("This quotation has already been converted to an invoice.");
    this.name = "QuotationAlreadyConvertedError";
  }
}
