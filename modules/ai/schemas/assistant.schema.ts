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

export const assistantFactSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
    detail: z.string().nullable(),
    sourceTool: toolNameSchema,
    href: z.string().nullable(),
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
    suggestions: z.array(
      z
        .object({ label: z.string().min(1), href: z.string().min(1) })
        .strict()
    ),
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
