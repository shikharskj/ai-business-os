import type { AttentionItemType } from "@/modules/business-state/domain/types";

export type BriefAutonomyCue = "recommend" | "prepare";

export type BriefRowAction = {
  kind: "recommend" | "prepare";
  cue: BriefAutonomyCue;
  label: string;
  /** When set, the UI may call the propose route for this tool. */
  prepareToolName?: "send_payment_reminders";
};

/**
 * Deterministic L1/L2 actions for Needs attention rows (spec 06).
 * No LLM copy; no invented numbers.
 */
export function briefActionsForAttentionType(
  type: AttentionItemType
): BriefRowAction[] {
  if (type === "OVERDUE_RECEIVABLE") {
    return [
      {
        kind: "recommend",
        cue: "recommend",
        label: "Remind customer",
      },
      {
        kind: "prepare",
        cue: "prepare",
        label: "Prepare reminder",
        prepareToolName: "send_payment_reminders",
      },
    ];
  }
  if (type === "LOW_STOCK") {
    return [
      {
        kind: "recommend",
        cue: "recommend",
        label: "Review stock",
      },
    ];
  }
  if (type === "IDLE_QUOTATION") {
    return [
      {
        kind: "recommend",
        cue: "recommend",
        label: "Follow up",
      },
    ];
  }
  return [];
}

export const BRIEF_AUTONOMY_CUE_LABELS: Record<BriefAutonomyCue, string> = {
  recommend: "Recommend",
  prepare: "Prepare",
};
