"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  X,
} from "lucide-react";

import {
  AssistantActivity,
  type AssistantActivityStep,
} from "@/components/assistant/assistant-activity";
import { AssistantProse } from "@/components/assistant/assistant-prose";
import type { AssistantActionState } from "@/components/assistant/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  AiAssistantActionOutcome,
  AiAssistantFact,
  AiAssistantPendingAction,
  AiAssistantSuggestion,
} from "@/modules/ai/domain/assistant-types";

/**
 * Renders one assistant turn: activity timeline, prose, fact card/table, actions.
 * Verified figures only come from server-built facts (tool output), never model prose.
 */
export function AssistantMessageView({
  text,
  facts,
  suggestions,
  notices,
  pendingAction,
  action,
  isStreaming,
  activitySteps,
  onConfirm,
  onCancel,
}: {
  text: string;
  facts: AiAssistantFact[];
  suggestions: AiAssistantSuggestion[];
  notices: string[];
  pendingAction: (AiAssistantPendingAction & { token: string }) | null;
  action: AssistantActionState;
  isStreaming: boolean;
  activitySteps: AssistantActivityStep[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const showActivity = isStreaming || activitySteps.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {showActivity ? (
        <AssistantActivity steps={activitySteps} isStreaming={isStreaming} />
      ) : null}

      {text ? <AssistantProse text={text} /> : null}

      {facts.length > 0 ? <FactsSurface facts={facts} /> : null}

      {pendingAction ? (
        <PendingActionCard
          action={action}
          pending={pendingAction}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ) : null}

      {notices.map((notice) => (
        <p key={notice} className="text-sm text-muted-foreground">
          {notice}
        </p>
      ))}

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.href}
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={suggestion.href} />}
            >
              {suggestion.label}
              <ArrowUpRight className="size-3.5" />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FactsSurface({ facts }: { facts: AiAssistantFact[] }) {
  const useTable = facts.length >= 4;

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      {useTable ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 bg-transparent px-1 text-xs">
                Label
              </TableHead>
              <TableHead className="h-9 bg-transparent px-1 text-right text-xs">
                Value
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facts.map((fact) => (
              <TableRow key={fact.id} className="border-border/60">
                <TableCell className="px-1 py-2 align-top">
                  <FactLabel fact={fact} />
                  {fact.detail ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fact.detail}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="px-1 py-2 text-right align-top font-medium tabular-nums text-foreground">
                  {fact.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {facts.map((fact) => (
            <FactRow key={fact.id} fact={fact} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FactLabel({ fact }: { fact: AiAssistantFact }) {
  if (fact.href) {
    return (
      <Link
        href={fact.href}
        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        {fact.label}
      </Link>
    );
  }
  return <span className="text-sm text-muted-foreground">{fact.label}</span>;
}

function FactRow({ fact }: { fact: AiAssistantFact }) {
  return (
    <li className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate">
          <FactLabel fact={fact} />
        </span>
        <span className="shrink-0 text-base font-medium tabular-nums text-foreground">
          {fact.value}
        </span>
      </div>
      {fact.detail ? (
        <p className="text-xs text-muted-foreground">{fact.detail}</p>
      ) : null}
    </li>
  );
}

function PendingActionCard({
  pending,
  action,
  onConfirm,
  onCancel,
}: {
  pending: AiAssistantPendingAction & { token: string };
  action: AssistantActionState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (action.status === "executed") {
    return <ExecutedOutcome outcome={action.outcome} />;
  }

  if (action.status === "cancelled") {
    return <p className="text-sm text-muted-foreground">Cancelled.</p>;
  }

  if (action.status === "failed") {
    return (
      <p className="flex items-start gap-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        {action.message}
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-medium text-foreground">
            {pending.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{pending.summary}</p>
        </div>
      </div>
      <ul className="mb-3 flex flex-col gap-1.5">
        {pending.fields.map((field) => (
          <li
            key={field.label}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-2.5 py-2 text-sm"
          >
            <span className="text-muted-foreground">{field.label}</span>
            <span className="font-medium text-foreground">{field.value}</span>
          </li>
        ))}
      </ul>
      <p className="mb-3 text-xs text-muted-foreground">{pending.impact}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={action.status === "running"}
          onClick={onConfirm}
        >
          {action.status === "running" ? (
            <Spinner className="size-3.5" />
          ) : (
            <Check className="size-3.5" />
          )}
          Confirm
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={action.status === "running"}
          onClick={onCancel}
        >
          <X className="size-3.5" />
          Cancel
        </Button>
      </div>
    </section>
  );
}

function ExecutedOutcome({ outcome }: { outcome: AiAssistantActionOutcome }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{outcome.title}</p>
      <FactsSurface facts={outcome.facts} />
    </div>
  );
}

export function UserBubble({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-end", className)}>
      <p className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2.5 text-base whitespace-pre-wrap text-foreground">
        {text}
      </p>
    </div>
  );
}
