export class ExpenseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseError";
  }
}

export class ExpenseNotFoundError extends ExpenseError {
  constructor() {
    super("Expense was not found.");
    this.name = "ExpenseNotFoundError";
  }
}

export class ExpenseValidationError extends ExpenseError {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseValidationError";
  }
}
