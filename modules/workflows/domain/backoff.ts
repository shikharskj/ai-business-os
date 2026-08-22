import {
  WORKFLOW_BACKOFF_BASE_MS,
  WORKFLOW_BACKOFF_MAX_MS,
} from "@/modules/workflows/domain/types";

/** Exponential backoff from attemptCount (1-based after claim). */
export function workflowBackoffMs(attemptCount: number): number {
  const exp = Math.max(0, attemptCount - 1);
  const delay = WORKFLOW_BACKOFF_BASE_MS * 2 ** exp;
  return Math.min(delay, WORKFLOW_BACKOFF_MAX_MS);
}

export function nextWorkflowAttemptAt(attemptCount: number, now: Date): Date {
  return new Date(now.getTime() + workflowBackoffMs(attemptCount));
}
