import type { DashboardView } from "@/modules/ai/domain/dashboard-view.schema";
import { FactCitationError } from "@/modules/ai/domain/supervisor-types";
import type { FactsBundle } from "@/modules/ai/domain/supervisor-types";

/**
 * Quality gate: every money/series citation on the view must exist in the facts bundle.
 * Does not invent or recalculate financial values.
 */
export function assertViewCitesFacts(
  view: DashboardView,
  facts: FactsBundle
): void {
  const factMap = new Map(facts.facts.map((f) => [f.id, f]));
  for (const region of view.regions) {
    for (const component of region.components) {
      // Validate MetricCard money citations
      if (component.type === "MetricCard") {
        const fact = factMap.get(component.value.factId);
        if (!fact) {
          throw new FactCitationError(
            `Dashboard component "${component.id}" cites unknown fact "${component.value.factId}".`
          );
        }
        if (fact.kind === "money") {
          // Validate the money payload matches the fact's canonical value
          if (
            component.value.amountMinor !== fact.value ||
            component.value.currency !== fact.currency ||
            component.value.scale !== fact.scale
          ) {
            throw new FactCitationError(
              `Dashboard component "${component.id}" cites fact "${component.value.factId}" but money payload does not match canonical value.`
            );
          }
        } else {
          throw new FactCitationError(
            `Dashboard component "${component.id}" cites fact "${component.value.factId}" with incompatible kind "${fact.kind}" (expected "money").`
          );
        }
      }

      // Validate chart series citations
      if (component.type === "AreaChart" || component.type === "BarChart") {
        for (const series of component.series) {
          const fact = factMap.get(series.factId);
          if (!fact) {
            throw new FactCitationError(
              `Dashboard component "${component.id}" series "${series.key}" cites unknown fact "${series.factId}".`
            );
          }
          if (fact.kind !== "series") {
            throw new FactCitationError(
              `Dashboard component "${component.id}" series "${series.key}" cites fact "${series.factId}" with incompatible kind "${fact.kind}" (expected "series").`
            );
          }
        }
      }

      // Validate ActivityList item citations
      if (component.type === "ActivityList") {
        for (const item of component.items) {
          if (item.amount) {
            const fact = factMap.get(item.amount.factId);
            if (!fact) {
              throw new FactCitationError(
                `Dashboard component "${component.id}" item "${item.id}" cites unknown fact "${item.amount.factId}".`
              );
            }
            if (fact.kind === "money") {
              if (
                item.amount.amountMinor !== fact.value ||
                item.amount.currency !== fact.currency ||
                item.amount.scale !== fact.scale
              ) {
                throw new FactCitationError(
                  `Dashboard component "${component.id}" item "${item.id}" cites fact "${item.amount.factId}" but money payload does not match canonical value.`
                );
              }
            } else {
              throw new FactCitationError(
                `Dashboard component "${component.id}" item "${item.id}" cites fact "${item.amount.factId}" with incompatible kind "${fact.kind}" (expected "money").`
              );
            }
          }
        }
      }
    }
  }
}

export function factIdsFromBundle(facts: FactsBundle): ReadonlySet<string> {
  return new Set(facts.facts.map((f) => f.id));
}
