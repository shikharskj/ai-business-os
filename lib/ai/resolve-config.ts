import { AiConfigError, type AiProviderName } from "@/lib/ai/types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export type AiConfig =
  | { provider: "stub"; model: string }
  | { provider: "gemini"; apiKey: string; model: string };

export type AiEnvInput = {
  nodeEnv: string;
  aiProvider?: string;
  geminiApiKey?: string;
  geminiModel?: string;
};

export const STUB_MODEL = "stub-deterministic";

function requestedProvider(input: AiEnvInput): AiProviderName | null {
  const explicit = input.aiProvider?.trim();
  if (!explicit) {
    return null;
  }
  if (explicit === "gemini" || explicit === "stub") {
    return explicit;
  }
  if (explicit === "openai") {
    throw new AiConfigError(
      'AI_PROVIDER "openai" is no longer supported. Use AI_PROVIDER=gemini with GEMINI_API_KEY.'
    );
  }
  throw new AiConfigError(
    `AI_PROVIDER must be "gemini" or "stub", received "${explicit}".`
  );
}

/**
 * Resolves which model backend the assistant chat route should use.
 * Local/dev without a Gemini key uses stub (no network). Production refuses stub.
 */
export function resolveAiConfig(input: AiEnvInput): AiConfig {
  const explicit = requestedProvider(input);
  const geminiApiKey = input.geminiApiKey?.trim();
  const provider: AiProviderName =
    explicit ??
    (geminiApiKey
      ? "gemini"
      : input.nodeEnv === "production"
        ? "gemini"
        : "stub");

  if (provider === "stub") {
    if (input.nodeEnv === "production") {
      throw new AiConfigError(
        "The stub AI provider is not allowed in production. Set AI_PROVIDER=gemini and provide GEMINI_API_KEY."
      );
    }
    return { provider: "stub", model: STUB_MODEL };
  }

  if (!geminiApiKey) {
    throw new AiConfigError(
      "GEMINI_API_KEY is required for the Gemini provider. Leave AI_PROVIDER unset in development to use the stub path."
    );
  }

  return {
    provider: "gemini",
    apiKey: geminiApiKey,
    model: input.geminiModel?.trim() || DEFAULT_GEMINI_MODEL,
  };
}
