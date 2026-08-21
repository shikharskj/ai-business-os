export {
  DASHBOARD_COMPONENT_TYPES,
  dashboardViewSchema,
  parseDashboardView,
  safeParseDashboardView,
  type DashboardComponent,
  type DashboardComponentType,
  type DashboardMoneyPayload,
  type DashboardRegion,
  type DashboardView,
} from "@/modules/ai/domain/dashboard-view.schema";
export {
  AiSupervisorError,
  FactCitationError,
  type Anomaly,
  type AnomalyBundle,
  type AnalystInsight,
  type DashboardFact,
  type FactsBundle,
  type InsightsBundle,
  type SupervisorIntent,
  type SupervisorPlan,
  type SupervisorRunResult,
} from "@/modules/ai/domain/supervisor-types";
export { assertViewCitesFacts } from "@/modules/ai/domain/quality-gate";
export {
  buildFallbackView,
  runDashboardSupervisor,
  type RunSupervisorInput,
} from "@/modules/ai/application/supervisor";
export { runDataFetcher } from "@/modules/ai/application/workers/data-fetcher";
export { runDataAnalyst } from "@/modules/ai/application/workers/data-analyst";
export { runAnomalyScout } from "@/modules/ai/application/workers/anomaly-scout";
export { runGenerativeUiMapper } from "@/modules/ai/application/workers/generative-ui-mapper";

/*
 * AI gateway tools (spec 27) — the only way AI reaches business data.
 *
 * Client dashboard components import this barrel, so server-only wiring
 * (`modules/ai/infrastructure/tool-context`) is deliberately not re-exported here.
 */
export {
  AiToolAuthorizationError,
  AiToolError,
  AiToolIdentityOverrideError,
  AiToolInputError,
  AiToolNotFoundError,
  AiToolOutputError,
  AiToolResourceNotFoundError,
} from "@/modules/ai/domain/errors";
export {
  AI_TOOL_NAMES,
  type AiToolCategory,
  type AiToolContext,
  type AiToolDefinition,
  type AiToolInvocationResult,
  type AiToolName,
  type AiToolRepositories,
  type AiToolSpec,
} from "@/modules/ai/domain/tool-types";
export { defineAiTool } from "@/modules/ai/domain/define-tool";
export { assertNoIdentityOverride } from "@/modules/ai/domain/identity-guard";
export {
  AI_POLICY_VERSION,
  AI_SYSTEM_POLICY,
} from "@/modules/ai/domain/system-policy";
export {
  sanitizeUntrustedText,
  UNTRUSTED_CONTENT_CLOSE,
  UNTRUSTED_CONTENT_OPEN,
  wrapUntrustedContent,
} from "@/modules/ai/domain/untrusted-content";
export { toMoneyView } from "@/modules/ai/domain/tool-output";
export {
  AI_TOOLS,
  aiToolNames,
  findAiTool,
  listAiToolSpecsForRole,
  listAiToolsForRole,
  requireAiTool,
  toAiToolSpec,
} from "@/modules/ai/application/tools/registry";
export {
  AI_TOOL_AUDIT_ACTION,
  AI_TOOL_AUDIT_RESOURCE,
  executeAiTool,
  runAiToolCall,
  type AiToolFailure,
  type AiToolSuccess,
  type ExecuteAiToolInput,
} from "@/modules/ai/application/execute-tool";
export {
  aiToolFailureMessage,
  aiToolResultMessage,
  hasPolicyPrecedence,
} from "@/modules/ai/application/conversation";
export {
  resolveAiToolPeriod,
  type AiToolPeriodInput,
} from "@/modules/ai/application/tool-period";

/* AI assistant (spec 28) — conversation, trust surface, confirmation gate. */
export type {
  AiAssistantActionOutcome,
  AiAssistantAnswer,
  AiAssistantFact,
  AiAssistantPendingAction,
  AiAssistantSource,
  AiAssistantSuggestion,
  AiAssistantTurn,
} from "@/modules/ai/domain/assistant-types";
export {
  containsFigures,
  splitAssistantAnswer,
} from "@/modules/ai/domain/assistant-answer";
export {
  factsFromToolResult,
  formatMoneyView,
} from "@/modules/ai/domain/assistant-facts";
export { previewAiAction, type AiActionPreview } from "@/modules/ai/domain/assistant-actions";
/*
 * `modules/ai/domain/action-token` is deliberately absent: it uses node:crypto
 * and this barrel is imported by client components.
 */
export {
  describeAssistantFailure,
  type AssistantFailure,
} from "@/modules/ai/application/assistant-failures";
export { runConfirmedAiAction } from "@/modules/ai/application/confirm-action";
export {
  assistantActionOutcomeSchema,
  assistantAnswerSchema,
  assistantAskSchema,
  assistantConfirmSchema,
  assistantFactSchema,
  assistantPendingActionSchema,
  assistantTurnSchema,
  MAX_ASSISTANT_HISTORY_TURNS,
  MAX_ASSISTANT_QUESTION_LENGTH,
  type AssistantAskInput,
  type AssistantConfirmInput,
} from "@/modules/ai/schemas/assistant.schema";
export {
  AI_TOOL_RANGE_PRESETS,
  MAX_AI_TOOL_ROWS,
  businessMetricsInputSchema,
  businessMetricsOutputSchema,
  expensesSummaryInputSchema,
  expensesSummaryOutputSchema,
  lowStockInputSchema,
  lowStockOutputSchema,
  moneyViewSchema,
  overdueInvoicesInputSchema,
  overdueInvoicesOutputSchema,
  paymentRemindersInputSchema,
  paymentRemindersOutputSchema,
  periodInputSchema,
  receivablesInputSchema,
  receivablesOutputSchema,
  salesSummaryInputSchema,
  salesSummaryOutputSchema,
  type BusinessMetricsOutput,
  type ExpensesSummaryOutput,
  type LowStockOutput,
  type MoneyView,
  type OverdueInvoicesOutput,
  type PaymentRemindersInput,
  type PaymentRemindersOutput,
  type ReceivablesOutput,
  type SalesSummaryOutput,
} from "@/modules/ai/schemas/ai-tool.schema";
