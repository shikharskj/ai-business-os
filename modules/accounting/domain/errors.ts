export class AccountingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountingError";
  }
}

export class UnbalancedJournalError extends AccountingError {
  constructor() {
    super("Journal is unbalanced: total debits must equal total credits.");
    this.name = "UnbalancedJournalError";
  }
}

export class InvalidJournalLineError extends AccountingError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidJournalLineError";
  }
}

export class ClosedPeriodError extends AccountingError {
  constructor(periodKey: string) {
    super(`Cannot post into closed accounting period ${periodKey}.`);
    this.name = "ClosedPeriodError";
  }
}

export class AccountNotFoundError extends AccountingError {
  constructor(code: string) {
    super(`Account ${code} was not found for this business.`);
    this.name = "AccountNotFoundError";
  }
}

export class JournalNotFoundError extends AccountingError {
  constructor(journalId: string) {
    super(`Journal ${journalId} was not found.`);
    this.name = "JournalNotFoundError";
  }
}

export class DuplicateReversalError extends AccountingError {
  constructor() {
    super("This journal has already been reversed.");
    this.name = "DuplicateReversalError";
  }
}

export class PostedJournalImmutableError extends AccountingError {
  constructor() {
    super("Posted journals cannot be updated or deleted. Use a reversal or adjustment.");
    this.name = "PostedJournalImmutableError";
  }
}
