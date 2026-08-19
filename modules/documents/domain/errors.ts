export class DocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentError";
  }
}

export class DocumentNotFoundError extends DocumentError {
  constructor() {
    super("Document was not found.");
    this.name = "DocumentNotFoundError";
  }
}

export class DocumentValidationError extends DocumentError {
  constructor(message: string) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

export class UnsupportedDocumentTypeError extends DocumentValidationError {
  constructor() {
    super(
      "This file type is not allowed. Upload a PDF, JPEG, PNG, or WebP file."
    );
    this.name = "UnsupportedDocumentTypeError";
  }
}

export class DocumentTooLargeError extends DocumentValidationError {
  constructor(maxBytes: number) {
    super(`This file is too large. The maximum size is ${maxBytes} bytes.`);
    this.name = "DocumentTooLargeError";
  }
}
