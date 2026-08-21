import { AiConfigError, AiProviderError } from "@/lib/ai/types";
import { AiToolError } from "@/modules/ai/domain/errors";

export type AssistantFailure = {
  status: number;
  code: string;
  message: string;
};

function readStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    statusCode?: unknown;
    status?: unknown;
    lastError?: { statusCode?: unknown; status?: unknown };
  };
  for (const value of [
    candidate.statusCode,
    candidate.status,
    candidate.lastError?.statusCode,
    candidate.lastError?.status,
  ]) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function readErrorText(error: unknown): string {
  if (!error || typeof error !== "object") {
    return typeof error === "string" ? error : "";
  }
  const candidate = error as {
    message?: unknown;
    lastError?: { message?: unknown };
    cause?: { message?: unknown };
  };
  const parts = [
    candidate.message,
    candidate.lastError?.message,
    candidate.cause?.message,
  ]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
  return parts;
}

/**
 * Maps assistant failures to a contained, user-facing error state.
 * Keep copy short — the UI emphasizes the answer, not safety boilerplate.
 * Also understands Vercel AI SDK provider errors (APICallError / RetryError).
 */
export function describeAssistantFailure(error: unknown): AssistantFailure {
  if (error instanceof AiConfigError) {
    return {
      status: 503,
      code: "AI_NOT_CONFIGURED",
      message: "The assistant is not configured yet.",
    };
  }

  if (error instanceof AiProviderError) {
    if (error.providerCode === "insufficient_quota") {
      return {
        status: 503,
        code: "AI_QUOTA_EXCEEDED",
        message: "AI quota is exhausted. Check your Gemini billing plan.",
      };
    }

    if (error.status === 429) {
      return {
        status: 503,
        code: "AI_RATE_LIMITED",
        message: "The AI provider is busy. Try again in a moment.",
      };
    }

    return {
      status: 503,
      code: "AI_UNAVAILABLE",
      message: "Couldn't reach the assistant just now.",
    };
  }

  if (error instanceof AiToolError) {
    return {
      status: error.code === "TOOL_FORBIDDEN" ? 403 : 400,
      code: error.code,
      message:
        error.code === "TOOL_FORBIDDEN"
          ? "Your role does not allow that action."
          : "Couldn't complete that action.",
    };
  }

  const statusCode = readStatusCode(error);
  const text = readErrorText(error);
  const lower = text.toLowerCase();

  if (
    statusCode === 429 ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota exceeded") ||
    lower.includes("insufficient_quota") ||
    lower.includes("rate limit")
  ) {
    const isDailyQuota =
      lower.includes("quota exceeded") ||
      lower.includes("free_tier") ||
      lower.includes("billing");
    return {
      status: 503,
      code: isDailyQuota ? "AI_QUOTA_EXCEEDED" : "AI_RATE_LIMITED",
      message: isDailyQuota
        ? "Gemini free-tier quota is exhausted. Wait a minute and try again, or check billing."
        : "The AI provider is busy. Try again in a moment.",
    };
  }

  return {
    status: 500,
    code: "ASSISTANT_FAILED",
    message: "Couldn't complete that.",
  };
}
