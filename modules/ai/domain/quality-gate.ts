import type { DashboardComponent, DashboardView } from "@/modules/ai/domain/dashboard-view.schema";
import { FactCitationError } from "@/modules/ai/domain/supervisor-types";
import type { FactsBundle } from "@/modules/ai/domain/supervisor-types";

function collectCitedFactIds(component: DashboardComponent): string[] {
  switch (component.type) {
    case "MetricCard":
      return [
        component.value.factId,
        ...(component.sparkline ? [component.sparkline.factId] : []),
      ];
    case "AreaChart":
    case "BarChart":
      return component.series.map((s) => s.factId);
    case "ActivityList":
      return component.items
        .map((item) => item.amount?.factId)
        .filter((id): id is string => Boolean(id));
    case "InsightBanner":
    case "AlertItem":
    case "EmptyState":
    case "DataTable":
      return [];
    default:
      return [];
  }
}

/**
 * Quality gate: every money/series citation on the view must exist in the facts bundle.
 * Does not invent or recalculate financial values.
 */
export function assertViewCitesFacts(
  view: DashboardView,
  facts: FactsBundle
): void {
  const known = new Set(facts.facts.map((f) => f.id));
  for (const region of view.regions) {
    for (const component of region.components) {
      for (const factId of collectCitedFactIds(component)) {
        if (!known.has(factId)) {
          throw new FactCitationError(
            `Dashboard component "${component.id}" cites unknown fact "${factId}".`
          );
        }
      }
    }
  }
}

export function factIdsFromBundle(facts: FactsBundle): ReadonlySet<string> {
  return new Set(facts.facts.map((f) => f.id));
}
