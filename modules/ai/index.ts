/*
 * Client-safe AI module surface.
 *
 * Browser components may import types and pure helpers from here. Anything that
 * reaches repositories, Prisma, or tool execution lives in `@/modules/ai/server`.
 */

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
  AiAutonomyPolicyError,
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
  aiToolFailureMessage,
  aiToolResultMessage,
  hasPolicyPrecedence,
} from "@/modules/ai/application/conversation";
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
export {
  describeAssistantFailure,
  type AssistantFailure,
} from "@/modules/ai/application/assistant-failures";
export {
  assistantActionOutcomeSchema,
  assistantAnswerSchema,
  assistantAppHrefSchema,
  assistantAskSchema,
  assistantChatMessagesSchema,
  assistantConfirmSchema,
  assistantFactSchema,
  assistantPendingActionSchema,
  assistantPendingActionWireSchema,
  assistantSuggestionSchema,
  assistantTurnSchema,
  assistantUiMessageSchema,
  MAX_ASSISTANT_CHAT_MESSAGES,
  MAX_ASSISTANT_CHAT_TEXT_CHARS,
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
  cashPositionInputSchema,
  cashPositionOutputSchema,
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
  periodMovementInputSchema,
  periodMovementOutputSchema,
  receivablesInputSchema,
  receivablesOutputSchema,
  salesSummaryInputSchema,
  salesSummaryOutputSchema,
  type BusinessMetricsOutput,
  type CashPositionOutput,
  type ExpensesSummaryOutput,
  type LowStockOutput,
  type MoneyView,
  type OverdueInvoicesOutput,
  type PaymentRemindersInput,
  type PaymentRemindersOutput,
  type PeriodMovementOutput,
  type ReceivablesOutput,
  type SalesSummaryOutput,
} from "@/modules/ai/schemas/ai-tool.schema";
