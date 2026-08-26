import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  DASHBOARD_CHART_RANGE_PRESETS,
  type DashboardDatePreset,
} from "@/modules/reporting/domain/dashboard-range";

const SHORT_LABELS: Record<(typeof DASHBOARD_CHART_RANGE_PRESETS)[number]["id"], string> =
  {
    last_7_days: "7d",
    last_30_days: "30d",
    last_3_months: "3mo",
  };

export function DashboardChartRangeFilters({
  activePreset,
}: {
  activePreset: DashboardDatePreset;
}) {
  return (
    <div
      className="flex flex-wrap rounded-md border border-border bg-background p-0.5"
      role="group"
      aria-label="Chart period"
    >
      {DASHBOARD_CHART_RANGE_PRESETS.map((preset) => {
        const active = activePreset === preset.id;
        return (
          <Link
            key={preset.id}
            href={`/app?range=${preset.id}`}
            className={cn(
              "rounded-[calc(var(--radius)-2px)] px-2.5 py-1.5 text-sm transition-colors sm:px-3",
              active
                ? "border border-border bg-muted font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
            aria-label={preset.label}
          >
            <span className="sm:hidden">{SHORT_LABELS[preset.id]}</span>
            <span className="hidden sm:inline">{preset.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
