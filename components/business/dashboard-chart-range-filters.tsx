import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  DASHBOARD_CHART_RANGE_PRESETS,
  type DashboardDatePreset,
} from "@/modules/reporting/domain/dashboard-range";

export function DashboardChartRangeFilters({
  activePreset,
}: {
  activePreset: DashboardDatePreset;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-border bg-background p-0.5"
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
              "rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm transition-colors",
              active
                ? "border border-border bg-muted font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            {preset.label}
          </Link>
        );
      })}
    </div>
  );
}
