"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  AssistantActivity,
  type AssistantActivityStep,
} from "@/components/assistant/assistant-activity";
import { AssistantProse } from "@/components/assistant/assistant-prose";
import { PendingActionCard } from "@/components/assistant/pending-action-card";
import type { AssistantActionState } from "@/components/assistant/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { splitAssistantAnswer } from "@/modules/ai/domain/assistant-answer";
import type {
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
  onPrepare,
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
  onPrepare: (pending: AiAssistantPendingAction & { token: string }) => void;
}) {
  const showActivity = isStreaming || activitySteps.length > 0;
  const { analysis, recommendations } = splitAssistantAnswer(text);
  const navigateSuggestions = suggestions.filter(
    (suggestion) => suggestion.kind === "navigate"
  );
  const prepareSuggestions = pendingAction
    ? []
    : suggestions.filter((suggestion) => suggestion.kind === "prepare");

  return (
    <div className="flex flex-col gap-3">
      {showActivity ? (
        <AssistantActivity steps={activitySteps} isStreaming={isStreaming} />
      ) : null}

      {analysis ? (
        <section className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Analysis
          </p>
          <AssistantProse text={analysis} />
        </section>
      ) : null}

      {recommendations.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recommend
          </p>
          <ul className="flex flex-col gap-1 pl-4 text-base text-foreground list-disc">
            {recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

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

      {prepareSuggestions.length > 0 || navigateSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {prepareSuggestions.map((suggestion) => (
            <Button
              key={suggestion.label}
              variant="outline"
              size="sm"
              type="button"
              onClick={() => onPrepare(suggestion.pendingAction)}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Prepare
              </span>
              {suggestion.label}
            </Button>
          ))}
          {navigateSuggestions.map((suggestion) => (
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
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Verified
      </p>
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
