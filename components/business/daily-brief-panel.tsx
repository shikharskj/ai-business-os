"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PendingActionCard } from "@/components/assistant/pending-action-card";
import type {
  AssistantActionState,
  AssistantPendingActionWire,
} from "@/components/assistant/types";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import type { BadgeTone } from "@/components/business/status-badge";
import { DASHBOARD_RAIL_HEADER_CLASS } from "@/components/business/dashboard-activity-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ATTENTION_RECORD_LABELS,
  ATTENTION_TYPE_LABELS,
  countOpenAttentionByType,
  type DailyBriefView,
} from "@/modules/business-state/application/build-daily-brief";
import { BRIEF_AUTONOMY_CUE_LABELS } from "@/modules/business-state/application/brief-actions";
import { moneyFromMajor } from "@/modules/shared-kernel/money";
import { cn } from "@/lib/utils";

const BRIEF_VISIBLE_ROW_CAP = 5;
/** Content-sized card — do not stretch to KPI column height. */
const BRIEF_CARD_CLASS = "flex flex-col";
/** Cap notes + queue so expand / prepare does not grow the KPI row. */
const BRIEF_SCROLL_BODY_CLASS =
  "min-h-0 max-h-[min(28rem,50vh)] overflow-y-auto px-0";

function snapshotMoney(value: DailyBriefView["snapshot"]["sales"]) {
  return moneyFromMajor(value.amount, value.currency, value.scale);
}

function typeTone(type: DailyBriefView["items"][number]["type"]): BadgeTone {
  if (type === "OVERDUE_RECEIVABLE") return "danger";
  if (type === "LOW_STOCK") return "warning";
  return "neutral";
}

function rowAccent(type: DailyBriefView["items"][number]["type"]): string {
  if (type === "OVERDUE_RECEIVABLE") {
    return "border-l-[var(--state-error)] bg-[var(--state-error-subtle)]/60";
  }
  if (type === "LOW_STOCK") {
    return "border-l-[var(--state-warning)] bg-[var(--state-warning-subtle)]/60";
  }
  return "border-l-border bg-muted/20";
}

function BriefMoney({
  value,
  className,
}: {
  value: DailyBriefView["snapshot"]["sales"];
  className?: string;
}) {
  const money = snapshotMoney(value);
  if (money.currency !== "INR") {
    return (
      <span className={cn("tabular-nums", className)}>
        {money.currency} {value.amount}
      </span>
    );
  }
  return <MoneyDisplay value={money} className={className} />;
}

function SnapshotAmount({
  label,
  value,
}: {
  label: string;
  value: DailyBriefView["snapshot"]["sales"];
}) {
  return (
    <span>
      <span className="text-muted-foreground">{label} </span>
      <BriefMoney value={value} className="font-medium text-foreground" />
    </span>
  );
}

function formatQueueCounts(
  counts: ReturnType<typeof countOpenAttentionByType>
): string | null {
  const parts: string[] = [];
  if (counts.overdue > 0) {
    parts.push(`${counts.overdue} overdue`);
  }
  if (counts.lowStock > 0) {
    parts.push(`${counts.lowStock} low stock`);
  }
  if (counts.idleQuotation > 0) {
    parts.push(
      `${counts.idleQuotation} idle quote${counts.idleQuotation === 1 ? "" : "s"}`
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function DailyBriefPanel({ brief }: { brief: DailyBriefView }) {
  const router = useRouter();
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pendingByItemId, setPendingByItemId] = useState<
    Record<string, AssistantPendingActionWire>
  >({});
  const [actionByItemId, setActionByItemId] = useState<
    Record<string, AssistantActionState>
  >({});
  const [proposingId, setProposingId] = useState<string | null>(null);

  const items = useMemo(
    () => brief.items.filter((item) => !hiddenIds.has(item.id)),
    [brief.items, hiddenIds]
  );
  const visibleCounts = countOpenAttentionByType(items);
  const queueCounts = formatQueueCounts(visibleCounts);
  const visibleItems = expanded
    ? items
    : items.slice(0, BRIEF_VISIBLE_ROW_CAP);
  const hiddenCount = Math.max(0, items.length - BRIEF_VISIBLE_ROW_CAP);

  const headerParts = [brief.greeting, "Yesterday"].filter(Boolean);

  async function dismiss(attentionItemId: string) {
    setError(null);
    setDismissingId(attentionItemId);
    setHiddenIds((current) => new Set(current).add(attentionItemId));
    try {
      const response = await fetch("/api/business-state/attention/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attentionItemId }),
      });
      if (!response.ok) {
        setHiddenIds((current) => {
          const next = new Set(current);
          next.delete(attentionItemId);
          return next;
        });
        setError("Could not dismiss. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setHiddenIds((current) => {
        const next = new Set(current);
        next.delete(attentionItemId);
        return next;
      });
      setError("Could not dismiss. Try again.");
    } finally {
      setDismissingId(null);
    }
  }

  async function prepareReminder(attentionItemId: string) {
    setError(null);
    setProposingId(attentionItemId);
    try {
      const response = await fetch("/api/assistant/actions/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attentionItemId }),
      });
      if (!response.ok) {
        setError("Could not prepare reminder. Try again.");
        return;
      }
      const data = (await response.json()) as {
        pendingAction?: AssistantPendingActionWire;
      };
      if (!data.pendingAction?.token) {
        setError("Could not prepare reminder. Try again.");
        return;
      }
      setPendingByItemId((current) => ({
        ...current,
        [attentionItemId]: data.pendingAction!,
      }));
      setActionByItemId((current) => ({
        ...current,
        [attentionItemId]: { status: "proposed" },
      }));
    } catch {
      setError("Could not prepare reminder. Try again.");
    } finally {
      setProposingId(null);
    }
  }

  async function confirmPending(attentionItemId: string) {
    const pending = pendingByItemId[attentionItemId];
    if (!pending) return;
    setActionByItemId((current) => ({
      ...current,
      [attentionItemId]: { status: "running" },
    }));
    try {
      const response = await fetch("/api/assistant/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pending.token }),
      });
      const data = (await response.json()) as {
        error?: { message?: string };
        toolName?: string;
        status?: "executed";
        title?: string;
        facts?: unknown[];
        auditRecordId?: string;
      };
      if (!response.ok) {
        setActionByItemId((current) => ({
          ...current,
          [attentionItemId]: {
            status: "failed",
            message:
              data.error?.message ?? "Confirmation failed. Nothing was changed.",
          },
        }));
        return;
      }
      setActionByItemId((current) => ({
        ...current,
        [attentionItemId]: {
          status: "executed",
          outcome: {
            toolName: (data.toolName ??
              pending.toolName) as AssistantPendingActionWire["toolName"],
            status: "executed",
            title: data.title ?? pending.title,
            facts: Array.isArray(data.facts)
              ? (data.facts as never[])
              : [],
            auditRecordId: data.auditRecordId ?? "audit-unavailable",
          },
        },
      }));
      router.refresh();
    } catch {
      setActionByItemId((current) => ({
        ...current,
        [attentionItemId]: {
          status: "failed",
          message: "Confirmation failed. Nothing was changed.",
        },
      }));
    }
  }

  function cancelPending(attentionItemId: string) {
    setPendingByItemId((current) => {
      const next = { ...current };
      delete next[attentionItemId];
      return next;
    });
    setActionByItemId((current) => ({
      ...current,
      [attentionItemId]: { status: "cancelled" },
    }));
  }

  return (
    <Card size="sm" className={BRIEF_CARD_CLASS}>
      <CardHeader className={DASHBOARD_RAIL_HEADER_CLASS}>
        <CardTitle className="text-base">Needs attention</CardTitle>
        <CardDescription>
          <span>{headerParts.join(" · ")}: </span>
          <span className="inline-flex flex-wrap gap-x-2 gap-y-0.5">
            <SnapshotAmount label="Sales" value={brief.snapshot.sales} />
            <SnapshotAmount
              label="Cash in"
              value={brief.snapshot.collections}
            />
            <SnapshotAmount label="Expenses" value={brief.snapshot.expenses} />
          </span>
          {queueCounts ? (
            <span className="mt-1 block text-sm text-muted-foreground">
              {queueCounts}
            </span>
          ) : null}
          <span className="mt-1 block text-sm text-muted-foreground">
            Yesterday snapshot · KPIs and chart use the range filter above.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className={BRIEF_SCROLL_BODY_CLASS}>
        {error ? (
          <p className="px-(--card-spacing) pb-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {brief.periodNotes.length > 0 ? (
          <ul className="divide-y divide-border border-b border-border">
            {brief.periodNotes.map((note) => {
              const body = (
                <div className="border-l-2 border-l-border bg-muted/20 px-3 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Inform
                  </p>
                  <p className="text-base font-medium text-foreground">
                    {note.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {note.detail}
                  </p>
                </div>
              );
              return (
                <li key={note.id}>
                  {note.href ? (
                    <Link
                      href={note.href}
                      className="block transition-colors hover:bg-muted/40"
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {items.length === 0 ? (
          <p className="px-(--card-spacing) py-2.5 text-base text-muted-foreground">
            Nothing needs attention right now.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {visibleItems.map((item) => {
                const typeLabel =
                  ATTENTION_TYPE_LABELS[item.type] ?? item.type;
                const recordLabel =
                  ATTENTION_RECORD_LABELS[item.resourceType] ?? "View";
                const pending = pendingByItemId[item.id];
                const action = actionByItemId[item.id] ?? {
                  status: "proposed" as const,
                };
                const prepareAction = item.actions.find(
                  (row) => row.kind === "prepare"
                );
                const recommendAction = item.actions.find(
                  (row) => row.kind === "recommend"
                );
                return (
                  <li key={item.id}>
                    <div
                      className={cn(
                        "flex items-start gap-2 border-l-2 px-3 py-3",
                        rowAccent(item.type)
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-medium text-foreground">
                            {item.title}
                          </p>
                          <StatusBadge tone={typeTone(item.type)}>
                            {typeLabel}
                          </StatusBadge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {item.body}
                        </p>
                        {recommendAction ? (
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {BRIEF_AUTONOMY_CUE_LABELS[recommendAction.cue]}
                            <span className="mx-1 font-normal normal-case tracking-normal">
                              · {recommendAction.label}
                            </span>
                          </p>
                        ) : null}
                        {item.amount ? (
                          <p className="mt-1 text-base font-medium">
                            <BriefMoney
                              value={{
                                amount: item.amount.amount,
                                currency: item.amount.currency,
                                scale: item.amount.scale,
                              }}
                            />
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-col gap-2">
                          {pending ? (
                            <PendingActionCard
                              pending={pending}
                              action={action}
                              onConfirm={() => {
                                void confirmPending(item.id);
                              }}
                              onCancel={() => {
                                cancelPending(item.id);
                              }}
                            />
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            {!pending && prepareAction ? (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                disabled={proposingId === item.id}
                                onClick={() => {
                                  void prepareReminder(item.id);
                                }}
                              >
                                <span className="mr-1 text-xs uppercase tracking-wide opacity-80">
                                  {BRIEF_AUTONOMY_CUE_LABELS[prepareAction.cue]}
                                </span>
                                {prepareAction.label}
                              </Button>
                            ) : null}
                            <Button
                              nativeButton={false}
                              variant="outline"
                              size="sm"
                              render={<Link href={item.href} />}
                            >
                              {recordLabel}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={dismissingId === item.id}
                              onClick={() => {
                                void dismiss(item.id);
                              }}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hiddenCount > 0 && !expanded ? (
              <div className="border-t border-border px-(--card-spacing) py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpanded(true);
                  }}
                >
                  Show {hiddenCount} more
                </Button>
              </div>
            ) : null}
            {expanded && items.length > BRIEF_VISIBLE_ROW_CAP ? (
              <div className="border-t border-border px-(--card-spacing) py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpanded(false);
                  }}
                >
                  Show less
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
