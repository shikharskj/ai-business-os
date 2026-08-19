export class PartyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartyError";
  }
}

export class PartyNotFoundError extends PartyError {
  constructor(message = "Customer was not found.") {
    super(message);
    this.name = "PartyNotFoundError";
  }
}

export class PartyValidationError extends PartyError {
  constructor(message: string) {
    super(message);
    this.name = "PartyValidationError";
  }
}

export class PartyInactiveError extends PartyError {
  constructor(message = "This customer is already inactive.") {
    super(message);
    this.name = "PartyInactiveError";
  }
}
