import { describe, expect, it } from "vitest";

import {
  AiConfigError,
  DEFAULT_GEMINI_MODEL,
  resolveAiConfig,
  STUB_MODEL,
} from "@/lib/ai";
import {
  listAiToolSpecsForRole,
  runAiToolCall,
} from "@/modules/ai/server";
import { toolContext } from "./tool-context-fixture";

describe("ai provider configuration", () => {
  it("uses the stub path in development without a Gemini key", () => {
    expect(resolveAiConfig({ nodeEnv: "development" })).toEqual({
      provider: "stub",
      model: STUB_MODEL,
    });
  });

  it("selects Gemini when a key is configured", () => {
    expect(
      resolveAiConfig({
        nodeEnv: "development",
        geminiApiKey: "gem-test",
      })
    ).toEqual({
      provider: "gemini",
      apiKey: "gem-test",
      model: DEFAULT_GEMINI_MODEL,
    });
  });

  it("honors an explicit AI_PROVIDER=gemini with a custom model", () => {
    expect(
      resolveAiConfig({
        nodeEnv: "development",
        aiProvider: "gemini",
        geminiApiKey: "gem-test",
        geminiModel: "gemini-custom",
      })
    ).toEqual({
      provider: "gemini",
      apiKey: "gem-test",
      model: "gemini-custom",
    });
  });

  it("rejects OpenAI and unknown providers", () => {
    expect(() =>
      resolveAiConfig({ nodeEnv: "development", aiProvider: "openai" })
    ).toThrow(AiConfigError);
    expect(() =>
      resolveAiConfig({ nodeEnv: "development", aiProvider: "anthropic" })
    ).toThrow(AiConfigError);
  });

  it("refuses the stub and missing keys in production", () => {
    expect(() =>
      resolveAiConfig({ nodeEnv: "production", aiProvider: "stub" })
    ).toThrow(AiConfigError);
    expect(() => resolveAiConfig({ nodeEnv: "production" })).toThrow(
      AiConfigError
    );
  });
});

describe("tool boundary (provider-agnostic)", () => {
  it("runs registered tools with the same contracts regardless of model transport", async () => {
    const specs = listAiToolSpecsForRole("OWNER");
    expect(specs.map((spec) => spec.name)).toContain("get_low_stock_products");

    const result = await runAiToolCall({
      context: toolContext(),
      toolName: "get_low_stock_products",
      argumentsJson: JSON.stringify({ limit: 5 }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toMatchObject({
        lowStockCount: 1,
        products: [{ name: "Basmati Rice" }],
      });
    }
  });
});
