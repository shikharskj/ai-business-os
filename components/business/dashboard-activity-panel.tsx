"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";

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

/** Shared right-rail card chrome so Alerts and Activity stay aligned. */
export const DASHBOARD_RAIL_CARD_CLASS = "flex h-full min-h-48 flex-col";
export const DASHBOARD_RAIL_HEADER_CLASS = "shrink-0 gap-1 pb-3";
export const DASHBOARD_RAIL_BODY_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-y-auto";

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
    <Card size="sm" className={DASHBOARD_RAIL_CARD_CLASS}>
      <CardHeader className={DASHBOARD_RAIL_HEADER_CLASS}>
        <CardTitle className="text-base">{component.title}</CardTitle>
        {component.description ? (
          <CardDescription>{component.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn(DASHBOARD_RAIL_BODY_CLASS, "px-0")}>
        {component.items.length === 0 ? (
          <div className="flex flex-col gap-1 px-(--card-spacing)">
            <p className="text-base text-muted-foreground">No recent activity.</p>
            <p className="text-sm text-muted-foreground">
              Posted invoices will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {component.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-(--card-spacing) py-3 hover:bg-muted/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {initials(
                      item.subtitle?.split("·")[0]?.trim() || item.title
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-base">{item.title}</span>
                    {item.subtitle ? (
                      <span className="block truncate text-sm text-muted-foreground">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {item.badge ? (
                      <StatusBadge
                        tone={(item.badgeTone as BadgeTone) ?? "neutral"}
                      >
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
                        className="text-base font-medium"
                      />
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardInsightBanner({
  component,
  compact = false,
}: {
  component: Extract<DashboardComponent, { type: "InsightBanner" }>;
  compact?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const kindTone: BadgeTone =
    component.kind === "recommendation" ? "info" : "neutral";
  const kindLabel =
    component.kind === "fact" ? "Fact" : "Recommendation";

  const dismissButton = component.dismissible ? (
    <Button
      type="button"
      variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      aria-label="Dismiss"
      onClick={(e) => {
        e.preventDefault();
        setDismissed(true);
      }}
    >
      <X className="size-3.5" />
    </Button>
  ) : null;

  if (compact) {
    const accent =
      component.severity === "danger"
        ? "border-l-[var(--state-error)] bg-[var(--state-error-subtle)]/60"
        : component.severity === "warning"
          ? "border-l-[var(--state-warning)] bg-[var(--state-warning-subtle)]/60"
          : "border-l-border bg-muted/20";

    const body = (
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{component.title}</p>
          <StatusBadge size="sm" tone={kindTone}>
            {kindLabel}
          </StatusBadge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{component.detail}</p>
      </div>
    );

    return (
      <div
        className={cn(
          "flex items-start gap-2 border-l-2 px-3 py-2.5",
          accent
        )}
      >
        {component.href ? (
          <Link href={component.href} className="min-w-0 flex-1 hover:opacity-95">
            {body}
          </Link>
        ) : (
          body
        )}
        {dismissButton}
      </div>
    );
  }

  const severityBorder =
    component.severity === "danger"
      ? "border-[var(--state-error)]/40 bg-[var(--state-error-subtle)]"
      : component.severity === "warning"
        ? "border-[var(--state-warning)]/40 bg-[var(--state-warning-subtle)]"
        : "border-border bg-muted/30";

  const body = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-medium">{component.title}</p>
        <StatusBadge size="sm" tone={kindTone}>
          {kindLabel}
        </StatusBadge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{component.detail}</p>
    </div>
  );

  return (
    <div className={cn("rounded-md border p-4", severityBorder)}>
      <div className="flex items-start justify-between gap-3">
        {component.href ? (
          <Link href={component.href} className="min-w-0 flex-1 hover:opacity-95">
            {body}
          </Link>
        ) : (
          body
        )}
        {dismissButton}
      </div>
    </div>
  );
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
