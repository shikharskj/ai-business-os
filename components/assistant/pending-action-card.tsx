"use client";

import Link from "next/link";
import { AlertTriangle, Check, X } from "lucide-react";

import type { AssistantActionState } from "@/components/assistant/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type {
  AiAssistantActionOutcome,
  AiAssistantPendingAction,
} from "@/modules/ai/domain/assistant-types";

/**
 * Shared L3 confirm card for assistant chat and Daily Brief prepare actions.
 */
export function PendingActionCard({
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

  const isRunning = action.status === "running";

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Confirm
          </p>
          <h3 className="text-base font-medium text-foreground">
            {pending.title}
          </h3>
          <p className="mt-1 text-base text-muted-foreground">{pending.summary}</p>
        </div>
      </div>
      <ul className="mb-3 flex flex-col gap-1.5">
        {pending.fields.map((field) => (
          <li
            key={field.label}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-2.5 py-2 text-base"
          >
            <span className="text-muted-foreground">{field.label}</span>
            <span className="font-medium text-foreground">{field.value}</span>
          </li>
        ))}
      </ul>
      <p className="mb-3 text-sm text-muted-foreground">{pending.impact}</p>
      {action.status === "failed" ? (
        <p className="mb-3 flex items-start gap-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {action.message}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isRunning}
          onClick={onConfirm}
        >
          {isRunning ? (
            <Spinner className="size-3.5" />
          ) : (
            <Check className="size-3.5" />
          )}
          {action.status === "failed" ? "Try again" : "Confirm"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRunning}
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
      <p className="text-base font-medium text-foreground">{outcome.title}</p>
      {outcome.facts.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {outcome.facts.map((fact) => (
            <li
              key={fact.id}
              className={cn("rounded-lg bg-muted/60 px-2.5 py-2 text-base")}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{fact.label}</span>
                {fact.href ? (
                  <Link
                    href={fact.href}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {fact.value}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{fact.value}</span>
                )}
              </div>
              {fact.detail ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{fact.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
