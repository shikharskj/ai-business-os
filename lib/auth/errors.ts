export class AuthenticationError extends Error {
  readonly code = "unauthenticated" as const;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}
