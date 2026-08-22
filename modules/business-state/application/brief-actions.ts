import type { AttentionItemType } from "@/modules/business-state/domain/types";

export type BriefAutonomyCue = "recommend" | "prepare";

export type BriefRowAction = {
  kind: "recommend" | "prepare";
  cue: BriefAutonomyCue;
  label: string;
  /** When set, the UI may call the propose route for this tool. */
  prepareToolName?: "send_payment_reminders";
};

export type BriefActionOptions = {
  /**
   * Prepare reminder mutates via send_payment_reminders (`invoice:update`).
   * Hide the control when the member cannot confirm it.
   */
  canPrepareReminder: boolean;
};

/**
 * Deterministic L1/L2 actions for Needs attention rows (spec 06).
 * No LLM copy; no invented numbers.
 */
export function briefActionsForAttentionType(
  type: AttentionItemType,
  options: BriefActionOptions
): BriefRowAction[] {
  if (type === "OVERDUE_RECEIVABLE") {
    const actions: BriefRowAction[] = [
      {
        kind: "recommend",
        cue: "recommend",
        label: "Remind customer",
      },
    ];
    if (options.canPrepareReminder) {
      actions.push({
        kind: "prepare",
        cue: "prepare",
        label: "Prepare reminder",
        prepareToolName: "send_payment_reminders",
      });
    }
    return actions;
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
