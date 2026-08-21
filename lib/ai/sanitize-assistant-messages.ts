import type { UIMessage } from "ai";

import {
  assistantChatMessagesSchema,
  MAX_ASSISTANT_CHAT_MESSAGES,
  MAX_ASSISTANT_CHAT_TEXT_CHARS,
  MAX_ASSISTANT_QUESTION_LENGTH,
} from "@/modules/ai/schemas/assistant.schema";

/**
 * Client chat history is not trusted. Keep only user/assistant turns and text
 * parts so a crafted request cannot inject system messages or forged tool
 * results. The server re-runs tools and injects the system policy itself.
 */
export function sanitizeAssistantUiMessages(
  messages: UIMessage[]
): UIMessage[] {
  const sanitized: UIMessage[] = [];

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }

    // Malformed client payloads must be skipped, not throw into the chat route.
    if (!Array.isArray(message.parts)) {
      continue;
    }

    const textParts = message.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          part.type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
      )
      .map((part) => ({
        type: "text" as const,
        text: part.text.slice(0, MAX_ASSISTANT_QUESTION_LENGTH * 4).trim(),
      }))
      .filter((part) => part.text.length > 0);

    if (textParts.length === 0) {
      continue;
    }

    sanitized.push({
      id: message.id,
      role: message.role,
      parts: textParts,
    });
  }

  return sanitized.slice(-MAX_ASSISTANT_CHAT_MESSAGES);
}

/**
 * Validates and sanitizes client chat messages. Returns null when the payload
 * is empty, oversized, or fails the user/assistant text-only schema.
 */
export function parseAssistantChatMessages(
  raw: unknown
): UIMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  if (raw.length > MAX_ASSISTANT_CHAT_MESSAGES) {
    return null;
  }

  let combined = 0;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const parts = (entry as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        combined += ((part as { text: string }).text).length;
      }
    }
  }
  if (combined > MAX_ASSISTANT_CHAT_TEXT_CHARS) {
    return null;
  }

  const sanitized = sanitizeAssistantUiMessages(raw as UIMessage[]);
  const parsed = assistantChatMessagesSchema.safeParse(sanitized);
  if (!parsed.success) {
    return null;
  }

  return parsed.data as UIMessage[];
}
