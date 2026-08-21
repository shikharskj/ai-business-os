import { NextResponse } from "next/server";

import {
  assistantActionOutcomeSchema,
  assistantConfirmSchema,
  describeAssistantFailure,
} from "@/modules/ai";
import { runConfirmedAiAction } from "@/modules/ai/server";
import { verifyAiActionToken } from "@/modules/ai/domain/action-token";
import { resolveAiActionSecret } from "@/modules/ai/infrastructure/action-secret";
import { createAiToolContext } from "@/modules/ai/infrastructure/tool-context";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

const INVALID_CONFIRMATION = {
  code: "ACTION_NOT_CONFIRMABLE",
  message:
    "That confirmation is no longer valid. Ask again and confirm the new proposal. No business data was changed.",
};

/**
 * Executes an AI-proposed mutation after the user confirmed it.
 *
 * Nothing about the chat turn is trusted here. The token proves the confirmed
 * action is the one that was previewed, the tenant and user are re-resolved
 * from the session, and `executeAiTool` re-runs the identity guard, permission
 * check, and schema validation before the tool runs — then audits it.
 */
export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();

  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = assistantConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: INVALID_CONFIRMATION }, { status: 400 });
    }

    const context = await createAiToolContext({ correlationId });
    const payload = verifyAiActionToken({
      secret: resolveAiActionSecret(),
      token: parsed.data.token,
    });

    if (
      !payload ||
      payload.tenantId !== context.tenantId ||
      payload.actorUserId !== context.actorUserId
    ) {
      return NextResponse.json({ error: INVALID_CONFIRMATION }, { status: 400 });
    }

    const outcome = await runConfirmedAiAction({
      context,
      toolName: payload.toolName,
      argumentsJson: payload.argumentsJson,
    });

    const validated = assistantActionOutcomeSchema.safeParse(outcome);
    if (!validated.success) {
      console.error("AI action outcome schema drift after successful run:", {
        correlationId,
        error: validated.error,
      });
      // Mutation already completed — do not convert success into a failure.
      return NextResponse.json(
        {
          toolName: outcome.toolName,
          status: "executed" as const,
          title: outcome.title,
          facts: Array.isArray(outcome.facts) ? outcome.facts : [],
          auditRecordId:
            typeof outcome.auditRecordId === "string"
              ? outcome.auditRecordId
              : "audit-unavailable",
        },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    return NextResponse.json(validated.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const failure = describeAssistantFailure(error);
    console.error("AI assistant action failed:", { correlationId, error });
    return NextResponse.json(
      { error: { code: failure.code, message: failure.message } },
      { status: failure.status }
    );
  }
}
