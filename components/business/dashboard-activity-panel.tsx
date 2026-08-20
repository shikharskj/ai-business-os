"use client";

import Link from "next/link";
import { useState } from "react";

import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import type { BadgeTone } from "@/components/business/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { money } from "@/modules/shared-kernel/money";
import type { DashboardComponent } from "@/modules/ai";
import { cn } from "@/lib/utils";

function initials(title: string): string {
  const parts = title.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function DashboardActivityPanel({
  component,
}: {
  component: Extract<DashboardComponent, { type: "ActivityList" }>;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{component.title}</CardTitle>
        {component.description ? (
          <CardDescription>{component.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {component.items.length === 0 ? (
          <p className="text-base text-muted-foreground">No recent activity.</p>
        ) : (
          component.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {initials(item.subtitle?.split("·")[0]?.trim() || item.title)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-sm">{item.title}</span>
                {item.subtitle ? (
                  <span className="block truncate text-sm text-muted-foreground">
                    {item.subtitle}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {item.badge ? (
                  <StatusBadge tone={(item.badgeTone as BadgeTone) ?? "neutral"}>
                    {item.badge.replaceAll("_", " ")}
                  </StatusBadge>
                ) : null}
                {item.amount ? (
                  <MoneyDisplay
                    value={money(
                      BigInt(item.amount.amountMinor),
                      item.amount.currency,
                      item.amount.scale
                    )}
                    className="text-sm font-medium"
                  />
                ) : null}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardInsightBanner({
  component,
}: {
  component: Extract<DashboardComponent, { type: "InsightBanner" }>;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const severityBorder =
    component.severity === "danger"
      ? "border-[var(--state-error)]/40 bg-[var(--state-error-subtle)]"
      : component.severity === "warning"
        ? "border-[var(--state-warning)]/40 bg-[var(--state-warning-subtle)]"
        : "border-border bg-muted/30";

  const body = (
    <div className={cn("rounded-md border p-4", severityBorder)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-medium">{component.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{component.detail}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
            {component.kind === "fact" ? "Fact" : "Recommendation"}
          </p>
        </div>
        {component.dismissible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setDismissed(true);
            }}
          >
            Dismiss
          </Button>
        ) : null}
      </div>
    </div>
  );

  if (component.href) {
    return (
      <Link href={component.href} className="block hover:opacity-95">
        {body}
      </Link>
    );
  }
  return body;
}

export function DashboardEmptyState({
  component,
}: {
  component: Extract<DashboardComponent, { type: "EmptyState" }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{component.title}</CardTitle>
        <CardDescription>{component.description}</CardDescription>
      </CardHeader>
      {component.actions?.length ? (
        <CardContent className="flex flex-wrap gap-3">
          {component.actions.map((action) => (
            <Link key={action.href} href={action.href} className="text-base underline">
              {action.label}
            </Link>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
