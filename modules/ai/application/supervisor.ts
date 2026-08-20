import type { DashboardDeps } from "@/modules/reporting/application/dashboard";
import { assertViewCitesFacts } from "@/modules/ai/domain/quality-gate";
import {
  parseDashboardView,
  type DashboardView,
} from "@/modules/ai/domain/dashboard-view.schema";
import type {
  SupervisorIntent,
  SupervisorPlan,
  SupervisorRunResult,
} from "@/modules/ai/domain/supervisor-types";
import { runAnomalyScout } from "@/modules/ai/application/workers/anomaly-scout";
import { runDataAnalyst } from "@/modules/ai/application/workers/data-analyst";
import { runDataFetcher } from "@/modules/ai/application/workers/data-fetcher";
import { runGenerativeUiMapper } from "@/modules/ai/application/workers/generative-ui-mapper";

export type RunSupervisorInput = {
  tenantId: string;
  actorUserId: string;
  intent: SupervisorIntent;
  deps: DashboardDeps;
};

function buildPlan(intent: SupervisorIntent): SupervisorPlan {
  return {
    intent,
    steps: [
      { worker: "dataFetcher" },
      { worker: "dataAnalyst" },
      { worker: "anomalyScout" },
      { worker: "generativeUiMapper" },
    ],
  };
}

/**
 * Supervisor agent — plans, delegates to workers, quality-gates, returns Generative UI view.
 * Tenant id is taken only from authenticated input, never from model output.
 */
export async function runDashboardSupervisor(
  input: RunSupervisorInput
): Promise<SupervisorRunResult> {
  if (input.deps.tenantId !== input.tenantId) {
    throw new Error("Supervisor refused cross-tenant dashboard run.");
  }

  const plan = buildPlan(input.intent);
  const stepsCompleted: string[] = [];

  try {
    const facts = await runDataFetcher({
      tenantId: input.tenantId,
      deps: input.deps,
    });
    stepsCompleted.push("dataFetcher");

    const insights = runDataAnalyst(facts);
    stepsCompleted.push("dataAnalyst");

    const anomalies = runAnomalyScout(facts);
    stepsCompleted.push("anomalyScout");

    const rawView = runGenerativeUiMapper({
      facts,
      insights,
      anomalies,
      source: "supervisor",
    });
    stepsCompleted.push("generativeUiMapper");

    assertViewCitesFacts(rawView, facts);
    const view = parseDashboardView(rawView);

    return {
      view,
      plan,
      usedFallback: false,
      audit: {
        stepsCompleted,
        factCount: facts.facts.length,
        insightCount: insights.insights.length,
        anomalyCount: anomalies.anomalies.length,
      },
    };
  } catch {
    const fallback = await buildFallbackView(input);
    return {
      ...fallback,
      plan,
      usedFallback: true,
      audit: {
        stepsCompleted,
        factCount: fallback.audit.factCount,
        insightCount: 0,
        anomalyCount: 0,
      },
    };
  }
}

/** Deterministic AI-down / quality-failure path — still Dashboard-01 via mapper. */
export async function buildFallbackView(
  input: RunSupervisorInput
): Promise<{ view: DashboardView; audit: { factCount: number } }> {
  const facts = await runDataFetcher({
    tenantId: input.tenantId,
    deps: input.deps,
  });
  const view = parseDashboardView(
    runGenerativeUiMapper({
      facts,
      insights: { insights: [] },
      anomalies: runAnomalyScout(facts),
      source: "fallback",
    })
  );
  assertViewCitesFacts(view, facts);
  return { view, audit: { factCount: facts.facts.length } };
}
