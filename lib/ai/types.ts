/**
 * Shared AI error types for the assistant route boundary.
 * Provider wire formats live in @ai-sdk/* — not in this package.
 */

export type AiProviderName = "gemini" | "stub";

/** Configuration problem (missing key, unknown provider) — not a call failure. */
export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

/**
 * Provider call failed. Callers must degrade gracefully: AI failures never
 * break core business pages (invariant 33).
 */
export class AiProviderError extends Error {
  public readonly provider: AiProviderName;
  public readonly status: number | null;
  public readonly providerCode: string | null;

  constructor(input: {
    provider: AiProviderName;
    message: string;
    status?: number | null;
    providerCode?: string | null;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "AiProviderError";
    this.provider = input.provider;
    this.status = input.status ?? null;
    this.providerCode = input.providerCode ?? null;
  }
}
