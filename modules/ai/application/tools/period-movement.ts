import { composePeriodMovement } from "@/modules/ai/application/compose-period-movement";
import { resolveAiToolPeriod } from "@/modules/ai/application/tool-period";
import { defineAiTool } from "@/modules/ai/domain/define-tool";
import {
  periodMovementInputSchema,
  periodMovementOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";

export const periodMovementTool = defineAiTool({
  name: "explain_period_movement",
  description:
    "Compare this period's sales, expenses, and profit with the immediately previous period. Use this for why profit or sales moved. Returns application-computed deltas, a driver (sales/expenses/both/stable), largest current invoices, top expense categories, and overdue invoice ids for follow-up. Do not subtract figures yourself.",
  category: "read",
  permission: "report:read",
  autonomyLevel: "L0",
  inputSchema: periodMovementInputSchema,
  outputSchema: periodMovementOutputSchema,
  async execute(input, context) {
    const range = resolveAiToolPeriod({
      period: input,
      timezone: context.timezone,
    });
    return composePeriodMovement({ context, range });
  },
});
