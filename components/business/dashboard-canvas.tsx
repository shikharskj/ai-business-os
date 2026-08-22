"use client";

import { DailyBriefPanel } from "@/components/business/daily-brief-panel";
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
import type { DailyBriefView } from "@/modules/business-state/application/build-daily-brief";
import type { DashboardDatePreset } from "@/modules/reporting/domain/dashboard-range";

function renderComponent(
  component: DashboardComponent,
  chartRangePreset: DashboardDatePreset,
  options?: { compactInsight?: boolean }
) {
  switch (component.type) {
    case "MetricCard":
      return <DashboardMetricCard key={component.id} component={component} />;
    case "AreaChart":
    case "BarChart":
      return (
        <Card key={component.id} size="sm" className="flex h-full min-h-0 flex-col">
          <CardHeader className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">{component.title}</CardTitle>
              {component.description ? (
                <CardDescription className="text-xs">
                  {component.description}
                </CardDescription>
              ) : null}
            </div>
            <DashboardChartRangeFilters activePreset={chartRangePreset} />
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <DashboardAreaChartPanel component={component} />
          </CardContent>
        </Card>
      );
    case "ActivityList":
      return (
        <DashboardActivityPanel key={component.id} component={component} />
      );
    case "InsightBanner":
      return (
        <DashboardInsightBanner
          key={component.id}
          component={component}
          compact={options?.compactInsight}
        />
      );
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
          compact={options?.compactInsight}
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
  brief,
}: {
  view: DashboardView;
  chartRangePreset: DashboardDatePreset;
  brief: DailyBriefView;
}) {
  const empty = view.regions.find((r) => r.id === "empty");
  const kpi = view.regions.find((r) => r.id === "kpi");
  const main = view.regions.find((r) => r.id === "main");

  const mainComponents = main?.components ?? [];
  const charts = mainComponents.filter(
    (c) => c.type === "AreaChart" || c.type === "BarChart"
  );
  const activity = mainComponents.filter((c) => c.type === "ActivityList");

  return (
    <div className="flex flex-col gap-6">
      {empty && empty.components.length > 0 ? (
        <div className="flex flex-col gap-3">
          {empty.components.map((c) => renderComponent(c, chartRangePreset))}
        </div>
      ) : null}

      {/*
        Desktop: left = KPIs + chart; right = Needs attention + Recent activity
        stacked with normal gap (activity is not on a second grid row under the
        tall left column). Mobile: brief → activity → KPIs → chart.
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:gap-6">
        <div className="order-1 flex min-w-0 flex-col gap-6 lg:col-start-3 lg:row-start-1">
          <DailyBriefPanel brief={brief} />
          {activity.length > 0
            ? activity.map((c) => renderComponent(c, chartRangePreset))
            : null}
        </div>

        <div className="order-2 flex min-w-0 flex-col gap-6 lg:col-span-2 lg:row-start-1">
          {kpi ? (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpi.components.map((c) => renderComponent(c, chartRangePreset))}
            </div>
          ) : null}

          {charts.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-4">
              {charts.map((c) => renderComponent(c, chartRangePreset))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
