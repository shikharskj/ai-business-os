"use client";

import Link from "next/link";

import { money } from "@/modules/shared-kernel/money";
import { MoneyDisplay } from "@/components/business/money-display";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardComponent } from "@/modules/ai";

const toneClass: Record<string, string> = {
  success: "text-[var(--state-success)]",
  danger: "text-[var(--state-error)]",
  warning: "text-[var(--state-warning)]",
  neutral: "",
};

function MiniSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="text-muted-foreground"
      aria-hidden
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function DashboardMetricCard({
  component,
}: {
  component: Extract<DashboardComponent, { type: "MetricCard" }>;
}) {
  const value = money(
    BigInt(component.value.amountMinor),
    component.value.currency,
    component.value.scale
  );

  const card = (
    <Card
      size="sm"
      className={cn(
        "h-full min-h-28 border-border bg-gradient-to-b from-muted/50 to-card dark:from-muted/30",
        component.href && "transition-opacity hover:opacity-95"
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardDescription>{component.title}</CardDescription>
          {component.sparkline ? (
            <MiniSparkline points={component.sparkline.points} />
          ) : null}
        </div>
        <CardTitle
          className={cn(
            "text-2xl font-semibold tracking-tight",
            component.tone ? toneClass[component.tone] : undefined
          )}
        >
          <MoneyDisplay value={value} />
        </CardTitle>
        {component.caption ? (
          <CardDescription>{component.caption}</CardDescription>
        ) : null}
        {component.trend?.percentLabel ? (
          <CardDescription
            className={cn(
              component.trend.direction === "up" && "text-[var(--state-success)]",
              component.trend.direction === "down" && "text-[var(--state-error)]"
            )}
          >
            {component.trend.percentLabel}
          </CardDescription>
        ) : null}
      </CardHeader>
    </Card>
  );

  if (component.href) {
    return (
      <Link href={component.href} className="block h-full min-w-0 outline-none">
        {card}
      </Link>
    );
  }

  return card;
}
