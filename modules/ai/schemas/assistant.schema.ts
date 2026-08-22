import { z } from "zod";

import { AI_TOOL_NAMES } from "@/modules/ai/domain/tool-types";

export const MAX_ASSISTANT_QUESTION_LENGTH = 1000;
export const MAX_ASSISTANT_HISTORY_TURNS = 20;

/**
 * History replayed from the browser. Only user and assistant turns are
 * accepted: a client cannot inject a system message or forge a tool result,
 * and the chat route always injects the system policy server-side.
 */
export const assistantTurnSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
  })
  .strict();

export const assistantAskSchema = z
  .object({
    question: z.string().trim().min(1).max(MAX_ASSISTANT_QUESTION_LENGTH),
    history: z
      .array(assistantTurnSchema)
      .max(MAX_ASSISTANT_HISTORY_TURNS)
      .default([]),
  })
  .strict();

export const assistantConfirmSchema = z
  .object({
    token: z.string().min(1).max(8000),
  })
  .strict();

const toolNameSchema = z.enum(AI_TOOL_NAMES);

/**
 * In-app navigation only. Rejects absolute URLs, protocol-relative hosts, and
 * anything outside `/app…` so facts/suggestions cannot send users off-site.
 */
export const assistantAppHrefSchema = z
  .string()
  .min(1)
  .max(500)
  .refine(
    (value) =>
      value === "/app" ||
      (/^\/app\/[A-Za-z0-9/_-]+$/.test(value) &&
        !value.includes("//") &&
        !value.includes("\\")),
    { message: "Must be an app-relative /app path" }
  );

export const assistantFactSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
    detail: z.string().nullable(),
    sourceTool: toolNameSchema,
    href: assistantAppHrefSchema.nullable(),
  })
  .strict();

export const assistantPendingActionSchema = z
  .object({
    toolName: toolNameSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    impact: z.string().min(1),
    fields: z.array(
      z.object({ label: z.string().min(1), value: z.string() }).strict()
    ),
    argumentsJson: z.string(),
  })
  .strict();

export const assistantPendingActionWireSchema = assistantPendingActionSchema.extend({
  token: z.string().min(1).max(8000),
});

export const assistantSuggestionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("navigate"),
      label: z.string().min(1),
      href: assistantAppHrefSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("prepare"),
      label: z.string().min(1),
      cue: z.literal("prepare"),
      pendingAction: assistantPendingActionWireSchema,
    })
    .strict(),
]);

/** Validated before it leaves the server — nothing unshaped reaches the UI. */
export const assistantAnswerSchema = z
  .object({
    analysis: z.string(),
    recommendations: z.array(z.string().min(1)),
    facts: z.array(assistantFactSchema),
    sources: z.array(
      z
        .object({
          toolName: toolNameSchema,
          auditRecordId: z.string().min(1),
        })
        .strict()
    ),
    suggestions: z.array(assistantSuggestionSchema),
    pendingAction: assistantPendingActionSchema.nullable(),
    grounded: z.boolean(),
    unverifiedFigures: z.boolean(),
    notices: z.array(z.string().min(1)),
    provider: z.enum(["gemini", "stub"]),
    model: z.string().min(1),
  })
  .strict();

export const assistantActionOutcomeSchema = z
  .object({
    toolName: toolNameSchema,
    status: z.literal("executed"),
    title: z.string().min(1),
    facts: z.array(assistantFactSchema),
    auditRecordId: z.string().min(1),
  })
  .strict();

export type AssistantAskInput = z.infer<typeof assistantAskSchema>;
export type AssistantConfirmInput = z.infer<typeof assistantConfirmSchema>;

/** Max messages accepted from the client (history pairs + current turn). */
export const MAX_ASSISTANT_CHAT_MESSAGES = MAX_ASSISTANT_HISTORY_TURNS * 2 + 1;

/** Combined text budget across all chat message parts. */
export const MAX_ASSISTANT_CHAT_TEXT_CHARS =
  MAX_ASSISTANT_QUESTION_LENGTH * (MAX_ASSISTANT_HISTORY_TURNS + 1);

/**
 * Sanitized UI message shape after stripping tool/system parts. Only user and
 * assistant text turns may reach convertToModelMessages.
 */
export const assistantUiTextPartSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().min(1).max(MAX_ASSISTANT_QUESTION_LENGTH * 4),
  })
  .strict();

export const assistantUiMessageSchema = z
  .object({
    id: z.string().min(1).max(200),
    role: z.enum(["user", "assistant"]),
    parts: z.array(assistantUiTextPartSchema).min(1).max(20),
  })
  .strict();

export const assistantChatMessagesSchema = z
  .array(assistantUiMessageSchema)
  .min(1)
  .max(MAX_ASSISTANT_CHAT_MESSAGES)
  .superRefine((messages, ctx) => {
    const combined = messages.reduce(
      (sum, message) =>
        sum + message.parts.reduce((partSum, part) => partSum + part.text.length, 0),
      0
    );
    if (combined > MAX_ASSISTANT_CHAT_TEXT_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chat history exceeds the maximum combined text length.",
      });
    }
  });
