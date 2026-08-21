import { roleHasPermission } from "@/lib/security/permissions";
import { requireAiTool } from "@/modules/ai/application/tools/registry";
import {
  AiToolAuthorizationError,
  AiToolError,
  AiToolInputError,
} from "@/modules/ai/domain/errors";
import { assertNoIdentityOverride } from "@/modules/ai/domain/identity-guard";
import { AI_POLICY_VERSION } from "@/modules/ai/domain/system-policy";
import type {
  AiToolContext,
  AiToolDefinition,
  AiToolInvocationResult,
} from "@/modules/ai/domain/tool-types";

export const AI_TOOL_AUDIT_RESOURCE = "ai_tool";
export const AI_TOOL_AUDIT_ACTION = "ai.tool.invoked";

export type ExecuteAiToolInput = {
  context: AiToolContext;
  toolName: string;
  /** Set by the caller once the user confirmed a high-risk action (spec 28). */
  confirmed?: boolean;
} & (
  | { input: unknown; argumentsJson?: undefined }
  /** Raw provider tool-call arguments. Untrusted until parsed and validated. */
  | { argumentsJson: string; input?: undefined }
);

export type AiToolFailure = {
  ok: false;
  toolName: string;
  code: string;
  message: string;
};

export type AiToolSuccess = { ok: true } & AiToolInvocationResult;

function parseArguments(argumentsJson: string): unknown {
  if (argumentsJson.trim() === "") {
    return {};
  }
  try {
    return JSON.parse(argumentsJson);
  } catch {
    throw new AiToolInputError("Tool arguments were not valid JSON.");
  }
}

async function recordInvocation(input: {
  context: AiToolContext;
  tool: AiToolDefinition | null;
  toolName: string;
  outcome: "success" | "denied" | "failed";
  errorCode?: string;
  durationMs: number;
}): Promise<string> {
  const record = await input.context.audit.append({
    tenantId: input.context.tenantId,
    actorUserId: input.context.actorUserId,
    action: AI_TOOL_AUDIT_ACTION,
    resource: AI_TOOL_AUDIT_RESOURCE,
    resourceId: input.toolName,
    // Metadata records the authorization decision, never the business payload.
    metadata: {
      outcome: input.outcome,
      category: input.tool?.category ?? "unknown",
      permission: input.tool?.permission ?? "unknown",
      role: input.context.role,
      policyVersion: AI_POLICY_VERSION,
      durationMs: input.durationMs,
      ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    },
    correlationId: input.context.correlationId,
  });

  return record.id;
}

/**
 * Runs one AI tool under trusted server context.
 *
 * Order matters: identity guard → authorization → input validation → use case →
 * output validation → audit. Authorization never depends on model input, and
 * every attempt (allowed or refused) is auditable.
 */
export async function executeAiTool(
  input: ExecuteAiToolInput
): Promise<AiToolInvocationResult> {
  const startedAt = Date.now();
  const { context } = input;

  if (!context.tenantId || !context.actorUserId) {
    throw new AiToolAuthorizationError("report:read");
  }

  let tool: AiToolDefinition | null = null;

  try {
    tool = requireAiTool(input.toolName);
    const rawInput =
      input.argumentsJson === undefined
        ? input.input
        : parseArguments(input.argumentsJson);
    assertNoIdentityOverride(rawInput);

    if (!roleHasPermission(context.role, tool.permission)) {
      throw new AiToolAuthorizationError(tool.permission);
    }

    if (tool.requiresConfirmation && !input.confirmed) {
      throw new AiToolError(
        "TOOL_CONFIRMATION_REQUIRED",
        `AI tool "${tool.name}" requires explicit user confirmation before it can run.`
      );
    }

    const output = await tool.run(rawInput, context);
    const auditRecordId = await recordInvocation({
      context,
      tool,
      toolName: tool.name,
      outcome: "success",
      durationMs: Date.now() - startedAt,
    });

    return {
      toolName: tool.name,
      category: tool.category,
      output,
      auditRecordId,
    };
  } catch (error) {
    const isAuthorizationFailure = error instanceof AiToolAuthorizationError;
    await recordInvocation({
      context,
      tool,
      toolName: input.toolName,
      outcome: isAuthorizationFailure ? "denied" : "failed",
      errorCode: error instanceof AiToolError ? error.code : "UNEXPECTED",
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

/**
 * Tool-call variant for the assistant loop: a failed tool must be reported back
 * to the model as data, not thrown into the chat transport.
 */
export async function runAiToolCall(input: {
  context: AiToolContext;
  toolName: string;
  argumentsJson: string;
  confirmed?: boolean;
}): Promise<AiToolSuccess | AiToolFailure> {
  try {
    const result = await executeAiTool({
      context: input.context,
      toolName: input.toolName,
      argumentsJson: input.argumentsJson,
      confirmed: input.confirmed,
    });
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof AiToolError) {
      return {
        ok: false,
        toolName: input.toolName,
        code: error.code,
        message: error.message,
      };
    }

    // Infrastructure failures must not leak internals to the model.
    return {
      ok: false,
      toolName: input.toolName,
      code: "TOOL_FAILED",
      message: "The tool could not be completed. No business data was changed.",
    };
  }
}
