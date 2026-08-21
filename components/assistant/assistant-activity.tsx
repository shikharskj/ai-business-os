"use client";

import {
  Check,
  Circle,
  Database,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type AssistantActivityStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  kind: "thinking" | "tool" | "writing";
};

const TOOL_LABELS: Record<string, string> = {
  get_outstanding_receivables: "Checking receivables",
  get_overdue_invoices: "Checking overdue invoices",
  get_sales_summary: "Checking sales",
  get_expenses_summary: "Checking expenses",
  get_low_stock_products: "Checking stock levels",
  get_business_metrics: "Checking business metrics",
  send_payment_reminders: "Preparing payment reminders",
};

export function friendlyToolLabel(toolName: string): string {
  return (
    TOOL_LABELS[toolName] ??
    toolName.replace(/^get_/, "").replaceAll("_", " ")
  );
}

/**
 * Builds an honest activity timeline from AI SDK message parts.
 * Only reflects real tool / stream phases — never invents elapsed time.
 */
export function activityStepsFromParts(
  parts: Array<{ type: string; toolName?: string; state?: string; text?: string }>,
  isStreaming: boolean,
): AssistantActivityStep[] {
  const steps: AssistantActivityStep[] = [];
  const toolParts = parts.filter(
    (part) => typeof part.type === "string" && part.type.startsWith("tool-"),
  );
  const hasText = parts.some(
    (part) => part.type === "text" && typeof part.text === "string" && part.text.length > 0,
  );

  if (isStreaming && toolParts.length === 0 && !hasText) {
    steps.push({
      id: "thinking",
      label: "Thinking",
      status: "running",
      kind: "thinking",
    });
  }

  for (const [index, part] of toolParts.entries()) {
    const name =
      part.toolName ?? part.type.replace(/^tool-/, "").replace(/-/g, "_");
    let status: AssistantActivityStep["status"] = "running";
    if (part.state === "output-available") status = "done";
    else if (part.state === "output-error") status = "error";
    else if (
      part.state === "input-streaming" ||
      part.state === "input-available" ||
      !part.state
    ) {
      status = "running";
    }

    steps.push({
      id: `tool-${index}-${name}`,
      label: friendlyToolLabel(name),
      status,
      kind: "tool",
    });
  }

  if (hasText && isStreaming) {
    steps.push({
      id: "writing",
      label: "Writing answer",
      status: "running",
      kind: "writing",
    });
  } else if (hasText && !isStreaming && toolParts.length > 0) {
    steps.push({
      id: "writing",
      label: "Writing answer",
      status: "done",
      kind: "writing",
    });
  }

  return steps;
}

function StepIcon({
  step,
}: {
  step: AssistantActivityStep;
}) {
  const className = cn(
    "size-3.5 shrink-0",
    step.status === "running" && "text-foreground",
    step.status === "done" && "text-muted-foreground",
    step.status === "error" && "text-destructive",
    step.status === "pending" && "text-muted-foreground/60",
  );

  if (step.status === "done") {
    return <Check className={className} />;
  }
  if (step.status === "running") {
    if (step.kind === "thinking") {
      return <Sparkles className={cn(className, "animate-pulse")} />;
    }
    if (step.kind === "writing") {
      return <FileText className={cn(className, "animate-pulse")} />;
    }
    return <Loader2 className={cn(className, "animate-spin")} />;
  }
  if (step.kind === "tool") {
    return <Database className={className} />;
  }
  if (step.kind === "thinking") {
    return <Search className={className} />;
  }
  return <Circle className={className} />;
}

/**
 * Claude-style vertical activity rail for assistant tool / stream phases.
 */
export function AssistantActivity({
  steps,
  isStreaming,
}: {
  steps: AssistantActivityStep[];
  isStreaming: boolean;
}) {
  if (steps.length === 0) return null;

  const doneTools = steps.filter(
    (step) => step.kind === "tool" && step.status === "done",
  ).length;
  const summary =
    doneTools > 0
      ? `Checked ${doneTools} record${doneTools === 1 ? "" : "s"}`
      : "Worked on your question";

  return (
    <details
      className="group text-sm text-muted-foreground"
      open={isStreaming}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        {isStreaming ? (
          <Sparkles className="size-3.5 animate-pulse text-foreground" />
        ) : (
          <Check className="size-3.5" />
        )}
        <span className="text-foreground">
          {isStreaming
            ? steps.find((s) => s.status === "running")?.label ?? "Working…"
            : summary}
        </span>
      </summary>
      <ol className="relative mt-2 ml-1.5 flex flex-col gap-0 border-l border-border pl-4">
        {steps.map((step) => (
          <li key={step.id} className="relative py-1.5 first:pt-0 last:pb-0">
            <span className="absolute top-2 -left-[1.3125rem] flex size-4 items-center justify-center rounded-full bg-sidebar">
              <StepIcon step={step} />
            </span>
            <span
              className={cn(
                "leading-snug",
                step.status === "running" && "font-medium text-foreground",
                step.status === "done" && "text-muted-foreground",
                step.status === "error" && "text-destructive",
              )}
            >
              {step.label}
              {step.status === "running" ? "…" : null}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
