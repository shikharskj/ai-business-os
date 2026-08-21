import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import { resolveAiConfig } from "@/lib/ai/resolve-config";
import { AiConfigError } from "@/lib/ai/types";
import { env } from "@/lib/env";

export type ResolvedAssistantModel = {
  provider: "gemini";
  modelId: string;
  languageModel: LanguageModel;
};

/**
 * Builds the Gemini language model for the assistant chat route.
 * Throws AiConfigError when the stub path is selected or the key is missing.
 */
export function getAssistantLanguageModel(): ResolvedAssistantModel {
  const config = resolveAiConfig({
    nodeEnv: env.NODE_ENV,
    aiProvider: env.AI_PROVIDER,
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL,
  });

  if (config.provider === "stub") {
    throw new AiConfigError(
      "The AI provider is not configured in this environment."
    );
  }

  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
  return {
    provider: "gemini",
    modelId: config.model,
    languageModel: google(config.model),
  };
}

export function isAssistantStubMode(): boolean {
  try {
    return (
      resolveAiConfig({
        nodeEnv: env.NODE_ENV,
        aiProvider: env.AI_PROVIDER,
        geminiApiKey: env.GEMINI_API_KEY,
        geminiModel: env.GEMINI_MODEL,
      }).provider === "stub"
    );
  } catch {
    return false;
  }
}
