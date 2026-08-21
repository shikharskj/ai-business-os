import "server-only";

/**
 * Server-only AI module surface: tool execution, confirmation, supervisor, and
 * anything that reaches repositories / Prisma / notifications.
 *
 * Client code must import from `@/modules/ai` (or domain paths), never here.
 */

export {
  buildFallbackView,
  runDashboardSupervisor,
  type RunSupervisorInput,
} from "@/modules/ai/application/supervisor";
export { runDataFetcher } from "@/modules/ai/application/workers/data-fetcher";
export { runDataAnalyst } from "@/modules/ai/application/workers/data-analyst";
export { runAnomalyScout } from "@/modules/ai/application/workers/anomaly-scout";
export { runGenerativeUiMapper } from "@/modules/ai/application/workers/generative-ui-mapper";
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
  resolveAiToolPeriod,
  type AiToolPeriodInput,
} from "@/modules/ai/application/tool-period";
export { runConfirmedAiAction } from "@/modules/ai/application/confirm-action";

// Re-export the client-safe surface so server callers can use one import.
export * from "@/modules/ai/index";
