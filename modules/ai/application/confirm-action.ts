import { executeAiTool } from "@/modules/ai/application/execute-tool";
import { requireAiTool } from "@/modules/ai/application/tools/registry";
import { previewAiAction } from "@/modules/ai/domain/assistant-actions";
import { factsFromToolResult } from "@/modules/ai/domain/assistant-facts";
import type { AiAssistantActionOutcome } from "@/modules/ai/domain/assistant-types";
import { AiToolError } from "@/modules/ai/domain/errors";
import type { AiToolContext } from "@/modules/ai/domain/tool-types";

/**
 * Runs a mutation the user explicitly confirmed.
 *
 * This is the second half of the confirmation gate. The first half refused to
 * run the tool during the chat turn; here the server independently re-resolves
 * the tool, refuses anything that is not a confirmable action, and hands over
 * to `executeAiTool`, which re-checks identity, role permission, and input
 * schema before running and audits the outcome. Confirming does not skip a
 * single check — it only supplies the missing consent.
 */
export async function runConfirmedAiAction(input: {
  context: AiToolContext;
  toolName: string;
  argumentsJson: string;
}): Promise<AiAssistantActionOutcome> {
  const tool = requireAiTool(input.toolName);

  if (tool.category !== "action" || !tool.requiresConfirmation) {
    throw new AiToolError(
      "TOOL_NOT_CONFIRMABLE",
      `AI tool "${tool.name}" is not a confirmable action.`
    );
  }

  const result = await executeAiTool({
    context: input.context,
    toolName: tool.name,
    argumentsJson: input.argumentsJson,
    confirmed: true,
  });

  let parsedArguments: unknown = {};
  try {
    parsedArguments = JSON.parse(input.argumentsJson) as unknown;
  } catch {
    parsedArguments = {};
  }

  return {
    toolName: result.toolName,
    status: "executed",
    title: previewAiAction({ toolName: tool.name, input: parsedArguments })?.title ?? tool.name,
    facts: factsFromToolResult({
      toolName: result.toolName,
      output: result.output,
    }),
    auditRecordId: result.auditRecordId,
  };
}
