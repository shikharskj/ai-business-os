import type { AttentionItemType } from "@/modules/business-state/domain/types";

export type BriefAutonomyCue = "inform" | "recommend" | "prepare";

export type BriefRowAction = {
  kind: "inform" | "recommend" | "prepare";
  cue: BriefAutonomyCue;
  label: string;
  /** When set, the UI may call the propose route for this tool. */
  prepareToolName?: "send_payment_reminders";
  /** L2 prepare that navigates (does not post). */
  prepareHref?: string;
};

export type BriefActionOptions = {
  /**
   * Prepare reminder mutates via send_payment_reminders (`invoice:update`).
   * Hide the control when the member cannot confirm it.
   */
  canPrepareReminder: boolean;
  /** Prepare purchase navigates to new bill (`purchase:create`). */
  canPreparePurchase?: boolean;
  resourceId?: string;
};

/**
 * Deterministic L0–L2 actions for Needs attention rows.
 * No LLM copy; no invented numbers; no auto-post.
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
    const actions: BriefRowAction[] = [
      {
        kind: "recommend",
        cue: "recommend",
        label: "Reorder",
      },
    ];
    if (options.canPreparePurchase && options.resourceId) {
      actions.push({
        kind: "prepare",
        cue: "prepare",
        label: "Prepare purchase",
        prepareHref: `/app/purchases/bills/new?productId=${encodeURIComponent(options.resourceId)}`,
      });
    }
    return actions;
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
  if (type === "UNUSUAL_EXPENSE") {
    return [
      {
        kind: "inform",
        cue: "inform",
        label: "Unusual amount",
      },
      {
        kind: "recommend",
        cue: "recommend",
        label: "Review expense",
      },
    ];
  }
  return [];
}

export const BRIEF_AUTONOMY_CUE_LABELS: Record<BriefAutonomyCue, string> = {
  inform: "Inform",
  recommend: "Recommend",
  prepare: "Prepare",
};
