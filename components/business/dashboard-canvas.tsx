"use client";

import {
  DashboardActivityPanel,
  DashboardEmptyState,
  DashboardInsightBanner,
  DASHBOARD_RAIL_BODY_CLASS,
  DASHBOARD_RAIL_CARD_CLASS,
  DASHBOARD_RAIL_HEADER_CLASS,
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
import { cn } from "@/lib/utils";

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
              <CardTitle>{component.title}</CardTitle>
              {component.description ? (
                <CardDescription>{component.description}</CardDescription>
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

function DashboardAlertsSection({
  components,
  chartRangePreset,
}: {
  components: DashboardComponent[];
  chartRangePreset: DashboardDatePreset;
}) {
  return (
    <Card size="sm" className={DASHBOARD_RAIL_CARD_CLASS}>
      <CardHeader className={DASHBOARD_RAIL_HEADER_CLASS}>
        <CardTitle>Alerts</CardTitle>
        <CardDescription className="text-sm">
          Facts and recommendations for this period.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(DASHBOARD_RAIL_BODY_CLASS, "px-0")}>
        {components.length === 0 ? (
          <p className="px-(--card-spacing) text-sm text-muted-foreground">
            No alerts right now.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {components.map((c) => (
              <li key={c.id}>
                {renderComponent(c, chartRangePreset, { compactInsight: true })}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
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

  const mainComponents = main?.components ?? [];
  const charts = mainComponents.filter(
    (c) => c.type === "AreaChart" || c.type === "BarChart"
  );
  const activity = mainComponents.filter((c) => c.type === "ActivityList");
  const insightComponents = insights?.components ?? [];

  return (
    <div className="flex flex-col gap-6">
      {empty && empty.components.length > 0 ? (
        <div className="flex flex-col gap-3">
          {empty.components.map((c) => renderComponent(c, chartRangePreset))}
        </div>
      ) : null}

      {/*
        lg: pair KPI rows with Alerts, chart with Activity so grid-row heights match.
        Mobile stacks in reading order: KPIs → Alerts → Chart → Activity.
      */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3 lg:gap-6">
        {kpi ? (
          <div className="grid min-w-0 auto-rows-fr gap-4 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-4">
            {kpi.components.map((c) => renderComponent(c, chartRangePreset))}
          </div>
        ) : null}

        <div className="min-w-0 lg:col-span-1">
          <DashboardAlertsSection
            components={insightComponents}
            chartRangePreset={chartRangePreset}
          />
        </div>

        {charts.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            {charts.map((c) => renderComponent(c, chartRangePreset))}
          </div>
        ) : null}

        {activity.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-1">
            {activity.map((c) => renderComponent(c, chartRangePreset))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
