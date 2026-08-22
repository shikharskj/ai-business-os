export class WorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
  }
}

/** Permanent: do not retry (policy, validation, missing workflow). */
export class WorkflowPermanentError extends WorkflowError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "WorkflowPermanentError";
  }
}

/** Transient: retry with backoff. */
export class WorkflowTransientError extends WorkflowError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "WorkflowTransientError";
  }
}

export function isWorkflowPermanentError(error: unknown): boolean {
  return error instanceof WorkflowPermanentError;
}
