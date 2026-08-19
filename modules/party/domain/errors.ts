export class PartyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartyError";
  }
}

export class PartyNotFoundError extends PartyError {
  constructor() {
    super("Customer was not found.");
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
  constructor() {
    super("This customer is already inactive.");
    this.name = "PartyInactiveError";
  }
}
