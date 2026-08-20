"use client";

import {
  DashboardActivityPanel,
  DashboardEmptyState,
  DashboardInsightBanner,
} from "@/components/business/dashboard-activity-panel";
import { DashboardAreaChartPanel } from "@/components/business/dashboard-area-chart";
import { DashboardChartRangeFilters } from "@/components/business/dashboard-chart-range-filters";
import { DashboardMetricCard } from "@/components/business/dashboard-metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardComponent, DashboardView } from "@/modules/ai";
import type { DashboardDatePreset } from "@/modules/reporting/domain/dashboard-range";

function renderComponent(
  component: DashboardComponent,
  chartRangePreset: DashboardDatePreset
) {
  switch (component.type) {
    case "MetricCard":
      return <DashboardMetricCard key={component.id} component={component} />;
    case "AreaChart":
    case "BarChart":
      return (
        <Card key={component.id} className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>{component.title}</CardTitle>
              {component.description ? (
                <CardDescription>{component.description}</CardDescription>
              ) : null}
            </div>
            <DashboardChartRangeFilters activePreset={chartRangePreset} />
          </CardHeader>
          <CardContent>
            <DashboardAreaChartPanel component={component} />
          </CardContent>
        </Card>
      );
    case "ActivityList":
      return (
        <div key={component.id} className="lg:col-span-1">
          <DashboardActivityPanel component={component} />
        </div>
      );
    case "InsightBanner":
      return <DashboardInsightBanner key={component.id} component={component} />;
    case "EmptyState":
      return <DashboardEmptyState key={component.id} component={component} />;
    case "AlertItem":
      return (
        <DashboardInsightBanner
          key={component.id}
          component={{
            type: "InsightBanner",
            id: component.id,
            title: component.title,
            detail: component.detail,
            href: component.href,
            severity: component.severity,
            kind: component.kind,
            dismissible: true,
          }}
        />
      );
    case "DataTable":
      return null;
    default:
      return null;
  }
}

export function DashboardCanvas({
  view,
  chartRangePreset,
}: {
  view: DashboardView;
  chartRangePreset: DashboardDatePreset;
}) {
  const insights = view.regions.find((r) => r.id === "insights");
  const empty = view.regions.find((r) => r.id === "empty");
  const kpi = view.regions.find((r) => r.id === "kpi");
  const main = view.regions.find((r) => r.id === "main");

  return (
    <div className="flex flex-col gap-6">
      {view.source === "fallback" ? (
        <p className="text-sm text-muted-foreground">
          Showing deterministic overview (AI supervisor unavailable or degraded).
        </p>
      ) : null}

      {insights && insights.components.length > 0 ? (
        <div className="flex flex-col gap-3">
          {insights.components.map((c) => renderComponent(c, chartRangePreset))}
        </div>
      ) : null}

      {empty && empty.components.length > 0 ? (
        <div className="flex flex-col gap-3">
          {empty.components.map((c) => renderComponent(c, chartRangePreset))}
        </div>
      ) : null}

      {kpi ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpi.components.map((c) => renderComponent(c, chartRangePreset))}
        </div>
      ) : null}

      {main ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {main.components.map((c) => renderComponent(c, chartRangePreset))}
        </div>
      ) : null}
    </div>
  );
}
