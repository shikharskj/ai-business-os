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
