import type { DashboardDateRange } from "@/modules/reporting/domain/dashboard-range";
import type { DashboardOverview } from "@/modules/reporting/domain/dashboard-types";
import type { DashboardView } from "@/modules/ai/domain/dashboard-view.schema";

export type SupervisorIntentKind = "overview" | "nl";

export type SupervisorIntent = {
  kind: SupervisorIntentKind;
  /** Natural-language text when kind is nl; ignored for overview. */
  text?: string;
  range: DashboardDateRange;
  tab?: "overview" | "reports" | "accounting";
};

export type FactKind =
  | "money"
  | "count"
  | "series"
  | "activity"
  | "alert";

export type DashboardFact = {
  id: string;
  kind: FactKind;
  label: string;
  /** Stringified minor units for money facts; count as decimal string; series as JSON. */
  value: string;
  currency?: string;
  scale?: number;
  href?: string;
  meta?: Record<string, string>;
};

export type FactsBundle = {
  tenantId: string;
  periodLabel: string;
  fromDate: string;
  toDate: string;
  overview: DashboardOverview;
  facts: DashboardFact[];
};

export type InsightKind = "fact" | "recommendation";

export type AnalystInsight = {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
  relatedFactIds: string[];
};

export type InsightsBundle = {
  insights: AnalystInsight[];
};

export type AnomalySeverity = "info" | "warning" | "danger";

export type Anomaly = {
  id: string;
  severity: AnomalySeverity;
  kind: InsightKind;
  title: string;
  detail: string;
  href?: string;
  relatedFactIds: string[];
};

export type AnomalyBundle = {
  anomalies: Anomaly[];
};

export type SupervisorPlanStep =
  | { worker: "dataFetcher" }
  | { worker: "dataAnalyst" }
  | { worker: "anomalyScout" }
  | { worker: "generativeUiMapper" };

export type SupervisorPlan = {
  intent: SupervisorIntent;
  steps: SupervisorPlanStep[];
};

export type SupervisorRunResult = {
  view: DashboardView;
  plan: SupervisorPlan;
  usedFallback: boolean;
  audit: {
    stepsCompleted: string[];
    factCount: number;
    insightCount: number;
    anomalyCount: number;
  };
};

export class AiSupervisorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiSupervisorError";
  }
}

export class FactCitationError extends AiSupervisorError {
  constructor(message: string) {
    super(message);
    this.name = "FactCitationError";
  }
}
