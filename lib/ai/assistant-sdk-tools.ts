import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";

import {
  AI_ACTION_TOKEN_TTL_MS,
  signAiActionToken,
} from "@/modules/ai/domain/action-token";
import { previewAiAction } from "@/modules/ai/domain/assistant-actions";
import { factsFromToolResult } from "@/modules/ai/domain/assistant-facts";
import type {
  AiAssistantFact,
  AiAssistantPendingAction,
  AiAssistantSource,
  AiAssistantSuggestion,
} from "@/modules/ai/domain/assistant-types";
import { resolveAiActionSecret } from "@/modules/ai/infrastructure/action-secret";
import { runAiToolCall } from "@/modules/ai/application/execute-tool";
import { listAiToolsForRole } from "@/modules/ai/application/tools/registry";
import type {
  AiToolContext,
  AiToolName,
} from "@/modules/ai/domain/tool-types";

const CONFIRMATION_REQUIRED_MESSAGE =
  "This action was not executed. It has been shown to the user as a confirmation request. Describe what will happen and stop; do not call the tool again in this turn.";

const TOOL_SUGGESTIONS: Partial<Record<AiToolName, AiAssistantSuggestion>> = {
  get_outstanding_receivables: {
    label: "View receivables",
    href: "/app/reports/receivables",
  },
  get_overdue_invoices: { label: "View invoices", href: "/app/sales/invoices" },
  get_low_stock_products: { label: "View stock", href: "/app/inventory/stock" },
  get_sales_summary: { label: "Sales report", href: "/app/reports/sales" },
  get_expenses_summary: {
    label: "Expenses report",
    href: "/app/reports/expenses",
  },
  get_business_metrics: { label: "Open dashboard", href: "/app" },
  send_payment_reminders: {
    label: "View invoices",
    href: "/app/sales/invoices",
  },
};

export type AssistantStreamSideEffects = {
  facts: AiAssistantFact[];
  sources: AiAssistantSource[];
  suggestions: AiAssistantSuggestion[];
  pendingAction: (AiAssistantPendingAction & { token: string }) | null;
  notices: string[];
};

/**
 * Builds AI SDK tools that always execute through modules/ai (authz, Zod, audit).
 * Confirmation-required tools never mutate; they attach a signed pending action.
 */
export function buildAssistantSdkTools(input: {
  context: AiToolContext;
  sideEffects: AssistantStreamSideEffects;
}): ToolSet {
  const tools: ToolSet = {};

  for (const definition of listAiToolsForRole(input.context.role)) {
    tools[definition.name] = tool({
      description: definition.description,
      inputSchema: definition.inputSchema as z.ZodType,
      execute: async (rawInput: unknown) => {
        if (definition.requiresConfirmation) {
          const proposal = previewAiAction({
            toolName: definition.name,
            input: rawInput,
          });
          if (!proposal) {
            input.sideEffects.notices.push(
              "The assistant proposed an action with invalid details, so nothing was prepared."
            );
            return {
              status: "rejected",
              message:
                "This action could not be prepared because its arguments were invalid. Nothing was changed.",
            };
          }

          const argumentsJson = JSON.stringify(rawInput ?? {});
          const pending: AiAssistantPendingAction = {
            toolName: definition.name as AiToolName,
            title: proposal.title,
            summary: proposal.summary,
            impact: proposal.impact,
            fields: proposal.fields,
            argumentsJson,
          };

          if (!input.sideEffects.pendingAction) {
            input.sideEffects.pendingAction = {
              ...pending,
              token: signAiActionToken({
                secret: resolveAiActionSecret(),
                payload: {
                  tenantId: input.context.tenantId,
                  actorUserId: input.context.actorUserId,
                  toolName: pending.toolName,
                  argumentsJson: pending.argumentsJson,
                  expiresAt: Date.now() + AI_ACTION_TOKEN_TTL_MS,
                },
              }),
            };
          }

          return {
            status: "confirmation_required",
            message: CONFIRMATION_REQUIRED_MESSAGE,
            preview: proposal,
          };
        }

        const outcome = await runAiToolCall({
          context: input.context,
          toolName: definition.name,
          argumentsJson: JSON.stringify(rawInput ?? {}),
        });

        if (!outcome.ok) {
          input.sideEffects.notices.push(outcome.message);
          return { status: "error", code: outcome.code, message: outcome.message };
        }

        const facts = factsFromToolResult({
          toolName: outcome.toolName,
          output: outcome.output,
        });
        for (const fact of facts) {
          if (!input.sideEffects.facts.some((existing) => existing.id === fact.id)) {
            input.sideEffects.facts.push(fact);
          }
        }
        input.sideEffects.sources.push({
          toolName: outcome.toolName,
          auditRecordId: outcome.auditRecordId,
        });
        const suggestion = TOOL_SUGGESTIONS[outcome.toolName];
        if (
          suggestion &&
          !input.sideEffects.suggestions.some((s) => s.href === suggestion.href)
        ) {
          input.sideEffects.suggestions.push(suggestion);
        }

        return { status: "ok", output: outcome.output };
      },
    });
  }

  return tools;
}
