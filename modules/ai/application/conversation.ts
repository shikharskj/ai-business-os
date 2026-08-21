import {
  UNTRUSTED_CONTENT_CLOSE,
  UNTRUSTED_CONTENT_OPEN,
  wrapUntrustedContent,
} from "@/modules/ai/domain/untrusted-content";
import { AI_SYSTEM_POLICY } from "@/modules/ai/domain/system-policy";

export function hasPolicyPrecedence(messages: Array<{ role: string; content: string }>): boolean {
  const first = messages[0];
  return (
    first?.role === "system" &&
    typeof first.content === "string" &&
    first.content.includes(AI_SYSTEM_POLICY.slice(0, 40))
  );
}

export function aiToolResultMessage(input: {
  toolCallId: string;
  toolName: string;
  result: unknown;
}): { role: "tool"; toolCallId: string; toolName: string; content: string } {
  return {
    role: "tool",
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    content: wrapUntrustedContent({
      label: input.toolName,
      content:
        typeof input.result === "string"
          ? input.result
          : JSON.stringify(input.result),
    }),
  };
}

export function aiToolFailureMessage(input: {
  toolCallId: string;
  toolName: string;
  code: string;
  message: string;
}): { role: "tool"; toolCallId: string; toolName: string; content: string } {
  return {
    role: "tool",
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    content: wrapUntrustedContent({
      label: input.toolName,
      content: JSON.stringify({ error: input.code, message: input.message }),
    }),
  };
}

export { UNTRUSTED_CONTENT_CLOSE, UNTRUSTED_CONTENT_OPEN };
