import "server-only";

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai";

import {
  buildAssistantSdkTools,
  type AssistantStreamSideEffects,
} from "@/lib/ai/assistant-sdk-tools";
import { getAssistantLanguageModel, isAssistantStubMode } from "@/lib/ai/model";
import { parseAssistantChatMessages } from "@/lib/ai/sanitize-assistant-messages";
import { assembleAssistantContext } from "@/modules/ai/application/assemble-assistant-context";
import { describeAssistantFailure } from "@/modules/ai/application/assistant-failures";
import { createAiToolContext } from "@/modules/ai/infrastructure/tool-context";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

export const AI_ASSISTANT_TEMPERATURE = 0.2;
export const AI_ASSISTANT_MAX_OUTPUT_TOKENS = 900;
export const AI_ASSISTANT_MAX_STEPS = 4;

type ChatRequestBody = {
  messages?: unknown;
  id?: string;
};

/**
 * Streaming assistant chat. Tools run through modules/ai; the AI SDK only
 * transports tokens and tool calls. Facts and pending actions are emitted as
 * data parts so the UI never invents numbers from model prose.
 */
export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();

  try {
    const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
    const messages = parseAssistantChatMessages(body?.messages);
    if (!messages) {
      return Response.json(
        { error: { code: "INVALID_QUESTION", message: "Send a question to continue." } },
        { status: 400 }
      );
    }

    // Auth + tenant before stub or live model work (invariant: no tenantless chat).
    const context = await createAiToolContext({ correlationId });

    if (isAssistantStubMode()) {
      return stubAssistantResponse();
    }

    const { languageModel, modelId, provider } = getAssistantLanguageModel();

    const sideEffects: AssistantStreamSideEffects = {
      facts: [],
      sources: [],
      suggestions: [],
      pendingAction: null,
      notices: [],
    };

    const tools = buildAssistantSdkTools({ context, sideEffects });
    const modelMessages = await convertToModelMessages(messages);
    const assembled = await assembleAssistantContext(context);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: languageModel,
          system: assembled.system,
          messages: modelMessages,
          tools,
          temperature: AI_ASSISTANT_TEMPERATURE,
          maxOutputTokens: AI_ASSISTANT_MAX_OUTPUT_TOKENS,
          stopWhen: stepCountIs(AI_ASSISTANT_MAX_STEPS),
          onFinish: () => {
            writer.write({
              type: "data-assistant-meta",
              data: {
                provider,
                model: modelId,
                facts: sideEffects.facts,
                sources: sideEffects.sources,
                suggestions: sideEffects.suggestions.slice(0, 3),
                pendingAction: sideEffects.pendingAction,
                notices: sideEffects.notices,
                grounded: sideEffects.facts.length > 0,
              },
            });
          },
        });

        writer.merge(
          result.toUIMessageStream({
            sendReasoning: false,
            onError: (error) => {
              const failure = describeAssistantFailure(error);
              console.error("AI assistant chat failed:", { correlationId, error });
              return failure.message;
            },
          })
        );
      },
      onError: (error) => {
        const failure = describeAssistantFailure(error);
        console.error("AI assistant chat failed:", { correlationId, error });
        return failure.message;
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const failure = describeAssistantFailure(error);
    console.error("AI assistant chat failed:", { correlationId, error });
    return Response.json(
      { error: { code: failure.code, message: failure.message } },
      { status: failure.status }
    );
  }
}

function stubAssistantResponse(): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "text-start", id: "stub-text" });
      writer.write({
        type: "text-delta",
        id: "stub-text",
        delta:
          "The AI provider is not configured in this environment, so no model answer is available.",
      });
      writer.write({ type: "text-end", id: "stub-text" });
      writer.write({
        type: "data-assistant-meta",
        data: {
          provider: "stub",
          model: "stub-deterministic",
          facts: [],
          sources: [],
          suggestions: [],
          pendingAction: null,
          notices: [],
          grounded: false,
        },
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
