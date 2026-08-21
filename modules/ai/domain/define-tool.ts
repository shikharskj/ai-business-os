import { z } from "zod";

import type { Permission } from "@/lib/security/permissions";
import { AiToolInputError, AiToolOutputError } from "@/modules/ai/domain/errors";
import type {
  AiToolCategory,
  AiToolContext,
  AiToolDefinition,
  AiToolName,
} from "@/modules/ai/domain/tool-types";

function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid tool input.";
  }
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/**
 * Wraps a typed tool implementation into a registry entry. Input and output are
 * both schema-validated here so no tool can skip validation and no unvalidated
 * model argument reaches a use case (code standards — AI Tools).
 */
export function defineAiTool<
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType,
>(config: {
  name: AiToolName;
  description: string;
  category: AiToolCategory;
  permission: Permission;
  requiresConfirmation?: boolean;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  execute: (
    input: z.output<InputSchema>,
    context: AiToolContext
  ) => Promise<z.output<OutputSchema>>;
}): AiToolDefinition {
  return {
    name: config.name,
    description: config.description,
    category: config.category,
    permission: config.permission,
    requiresConfirmation: config.requiresConfirmation ?? false,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    async run(rawInput, context) {
      const parsedInput = config.inputSchema.safeParse(rawInput);
      if (!parsedInput.success) {
        throw new AiToolInputError(firstIssueMessage(parsedInput.error));
      }

      const result = await config.execute(parsedInput.data, context);

      const parsedOutput = config.outputSchema.safeParse(result);
      if (!parsedOutput.success) {
        throw new AiToolOutputError(config.name);
      }

      return parsedOutput.data;
    },
  };
}
