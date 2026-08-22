import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { roleHasPermission } from "@/lib/security/permissions";
import { runAiToolCall } from "@/modules/ai/application/execute-tool";
import { signPendingPaymentReminder } from "@/modules/ai/application/sign-pending-reminder";
import { listAiToolsForRole } from "@/modules/ai/application/tools/registry";
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
import { wrapUntrustedContent } from "@/modules/ai/domain/untrusted-content";
import { resolveAiActionSecret } from "@/modules/ai/infrastructure/action-secret";
import {
  overdueInvoicesOutputSchema,
  periodMovementOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import type {
  AiToolContext,
  AiToolName,
} from "@/modules/ai/domain/tool-types";

const CONFIRMATION_REQUIRED_MESSAGE =
  "This action was not executed. It has been shown to the user as a confirmation request. Describe what will happen and stop; do not call the tool again in this turn.";

const TOOL_SUGGESTIONS: Partial<Record<AiToolName, AiAssistantSuggestion>> = {
  get_outstanding_receivables: {
    kind: "navigate",
    label: "View receivables",
    href: "/app/reports/receivables",
  },
  get_overdue_invoices: {
    kind: "navigate",
    label: "View invoices",
    href: "/app/sales/invoices",
  },
  get_low_stock_products: {
    kind: "navigate",
    label: "View stock",
    href: "/app/inventory/stock",
  },
  get_sales_summary: {
    kind: "navigate",
    label: "Sales report",
    href: "/app/reports/sales",
  },
  get_expenses_summary: {
    kind: "navigate",
    label: "Expenses report",
    href: "/app/reports/expenses",
  },
  get_business_metrics: { kind: "navigate", label: "Open dashboard", href: "/app" },
  get_cash_position: {
    kind: "navigate",
    label: "View accounts",
    href: "/app/accounting/accounts",
  },
  explain_period_movement: {
    kind: "navigate",
    label: "Profit report",
    href: "/app/reports/profit",
  },
  send_payment_reminders: {
    kind: "navigate",
    label: "View invoices",
    href: "/app/sales/invoices",
  },
};

function overdueInvoiceIdsFromOutput(toolName: string, output: unknown): string[] {
  if (toolName === "get_overdue_invoices") {
    const parsed = overdueInvoicesOutputSchema.safeParse(output);
    return parsed.success
      ? parsed.data.invoices.map((invoice) => invoice.invoiceId)
      : [];
  }
  if (toolName === "explain_period_movement") {
    const parsed = periodMovementOutputSchema.safeParse(output);
    return parsed.success ? parsed.data.overdueInvoiceIds : [];
  }
  return [];
}

function pushSuggestion(
  sideEffects: AssistantStreamSideEffects,
  suggestion: AiAssistantSuggestion
) {
  if (suggestion.kind === "navigate") {
    if (sideEffects.suggestions.some((existing) => existing.kind === "navigate" && existing.href === suggestion.href)) {
      return;
    }
  } else if (
    sideEffects.suggestions.some((existing) => existing.kind === "prepare")
  ) {
    return;
  }
  sideEffects.suggestions.push(suggestion);
}

export type AssistantStreamSideEffects = {
  facts: AiAssistantFact[];
  sources: AiAssistantSource[];
  suggestions: AiAssistantSuggestion[];
  pendingAction: (AiAssistantPendingAction & { token: string }) | null;
  notices: string[];
};

function fencedToolPayload(toolName: string, payload: unknown): string {
  return wrapUntrustedContent({
    label: toolName,
    content:
      typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

/**
 * Builds AI SDK tools that always execute through modules/ai (authz, Zod, audit).
 * Confirmation-required tools never mutate; they attach a signed pending action.
 * Tool payloads returned to the model are always UNTRUSTED-CONTENT fenced.
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
          if (input.sideEffects.pendingAction) {
            input.sideEffects.notices.push(
              "Only one action can be confirmed at a time. Confirm or cancel the current proposal first."
            );
            return fencedToolPayload(definition.name, {
              status: "rejected",
              message:
                "Another action is already awaiting confirmation. Confirm or cancel it before proposing another. Nothing was changed for this call.",
            });
          }

          const proposal = previewAiAction({
            toolName: definition.name,
            input: rawInput,
          });
          if (!proposal) {
            input.sideEffects.notices.push(
              "The assistant proposed an action with invalid details, so nothing was prepared."
            );
            return fencedToolPayload(definition.name, {
              status: "rejected",
              message:
                "This action could not be prepared because its arguments were invalid. Nothing was changed.",
            });
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

          return fencedToolPayload(definition.name, {
            status: "confirmation_required",
            message: CONFIRMATION_REQUIRED_MESSAGE,
            preview: proposal,
          });
        }

        const outcome = await runAiToolCall({
          context: input.context,
          toolName: definition.name,
          argumentsJson: JSON.stringify(rawInput ?? {}),
        });

        if (!outcome.ok) {
          input.sideEffects.notices.push(outcome.message);
          return fencedToolPayload(definition.name, {
            status: "error",
            code: outcome.code,
            message: outcome.message,
          });
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
        if (suggestion) {
          pushSuggestion(input.sideEffects, suggestion);
        }

        const overdueIds = overdueInvoiceIdsFromOutput(
          outcome.toolName,
          outcome.output
        );
        if (
          overdueIds.length > 0 &&
          !input.sideEffects.pendingAction &&
          roleHasPermission(input.context.role, "invoice:update")
        ) {
          const pending = signPendingPaymentReminder({
            tenantId: input.context.tenantId,
            actorUserId: input.context.actorUserId,
            invoiceIds: overdueIds.slice(0, 10),
            secret: resolveAiActionSecret(),
          });
          if (pending) {
            pushSuggestion(input.sideEffects, {
              kind: "prepare",
              label: "Prepare reminder",
              cue: "prepare",
              pendingAction: pending,
            });
          }
        }

        return fencedToolPayload(definition.name, {
          status: "ok",
          output: outcome.output,
        });
      },
    });
  }

  return tools;
}
