/**
 * Minimal AI provider adapter surface for future OpenAI wiring (spec 27).
 * Dashboard Supervisor Phase A–C does not require a live LLM.
 */
export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiAdapter = {
  readonly name: string;
  complete(messages: AiMessage[]): Promise<string>;
};

export function createStubAiAdapter(): AiAdapter {
  return {
    name: "stub",
    async complete() {
      return "";
    },
  };
}
