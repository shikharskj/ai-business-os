"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DashboardComponent } from "@/modules/ai";

export function DashboardAreaChartPanel({
  component,
}: {
  component: Extract<DashboardComponent, { type: "AreaChart" | "BarChart" }>;
}) {
  const keys = component.series.map((s) => s.key);
  const dates = component.series[0]?.points.map((p) => p.date) ?? [];
  const data = dates.map((date, index) => {
    const row: Record<string, string | number> = {
      date,
      label: component.series[0]?.points[index]?.label ?? date.slice(5),
    };
    for (const series of component.series) {
      row[series.key] = series.points[index]?.value ?? 0;
    }
    return row;
  });

  const chartConfig = Object.fromEntries(
    component.series.map((s, i) => [
      s.key,
      {
        label: s.label,
        color: i === 0 ? "var(--chart-1)" : "var(--chart-3)",
      },
    ])
  ) satisfies ChartConfig;

  if (data.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        No sales or expenses in this period yet.
      </p>
    );
  }

  const gradientIds = keys.map((key) => `fill-${key}`);

  return (
    <div className="flex flex-col gap-3">
      <p className="sr-only">{component.summary}</p>
      <ChartContainer config={chartConfig} className="aspect-2/1 w-full">
        <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12, top: 8 }}>
          <defs>
            {keys.map((key, index) => (
              <linearGradient
                key={key}
                id={gradientIds[index]}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={`var(--color-${key})`}
                  stopOpacity={index === 0 ? 0.35 : 0.22}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--color-${key})`}
                  stopOpacity={0.02}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={28}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {keys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              fill={`url(#${gradientIds[index]})`}
              strokeWidth={2}
              stackId={undefined}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
