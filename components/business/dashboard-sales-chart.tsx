"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type DashboardChartRow = {
  date: string;
  label: string;
  sales: number;
  expenses: number;
};

const chartConfig = {
  sales: {
    label: "Sales",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function DashboardSalesChart({
  data,
  summary,
}: {
  data: DashboardChartRow[];
  summary: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        No sales or expenses in this period yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="sr-only">{summary}</p>
      <ChartContainer config={chartConfig} className="aspect-2/1 w-full">
        <BarChart accessibilityLayer data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={48}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat("en-IN", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(value)
            }
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="sales" fill="var(--color-sales)" radius={2} />
          <Bar dataKey="expenses" fill="var(--color-expenses)" radius={2} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
