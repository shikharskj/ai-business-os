import { z } from "zod";

import { roleHasPermission } from "@/lib/security/permissions";
import { businessMetricsTool } from "@/modules/ai/application/tools/business-metrics";
import { expensesSummaryTool } from "@/modules/ai/application/tools/expenses-summary";
import { lowStockTool } from "@/modules/ai/application/tools/low-stock";
import { overdueInvoicesTool } from "@/modules/ai/application/tools/overdue-invoices";
import { paymentRemindersTool } from "@/modules/ai/application/tools/payment-reminders";
import { receivablesTool } from "@/modules/ai/application/tools/receivables";
import { salesSummaryTool } from "@/modules/ai/application/tools/sales-summary";
import { AiToolNotFoundError } from "@/modules/ai/domain/errors";
import type {
  AiToolDefinition,
  AiToolName,
  AiToolSpec,
} from "@/modules/ai/domain/tool-types";
import type { MembershipRole } from "@/modules/tenant/domain/types";

/**
 * The complete set of tools the AI may use. Read tools answer questions; the
 * single action tool (spec 28) cannot run without an explicit confirmation.
 */
export const AI_TOOLS: readonly AiToolDefinition[] = [
  salesSummaryTool,
  expensesSummaryTool,
  receivablesTool,
  overdueInvoicesTool,
  lowStockTool,
  businessMetricsTool,
  paymentRemindersTool,
];

export function findAiTool(toolName: string): AiToolDefinition | null {
  return AI_TOOLS.find((tool) => tool.name === toolName) ?? null;
}

export function requireAiTool(toolName: string): AiToolDefinition {
  const tool = findAiTool(toolName);
  if (!tool) {
    throw new AiToolNotFoundError(toolName);
  }
  return tool;
}

/** Tools the role may actually run. The model is never offered the rest. */
export function listAiToolsForRole(
  role: MembershipRole
): readonly AiToolDefinition[] {
  return AI_TOOLS.filter((tool) => roleHasPermission(role, tool.permission));
}

/**
 * Provider-agnostic tool advertisement. The JSON Schema is derived from each
 * tool's Zod input schema, so a provider swap cannot change tool contracts.
 */
export function toAiToolSpec(tool: AiToolDefinition): AiToolSpec {
  return {
    name: tool.name,
    description: tool.description,
    parameters: z.toJSONSchema(tool.inputSchema, {
      io: "input",
      unrepresentable: "any",
    }) as Record<string, unknown>,
  };
}

export function listAiToolSpecsForRole(role: MembershipRole): AiToolSpec[] {
  return listAiToolsForRole(role).map(toAiToolSpec);
}

export function aiToolNames(): AiToolName[] {
  return AI_TOOLS.map((tool) => tool.name);
}
