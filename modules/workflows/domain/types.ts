import type { OutboxEventRecord } from "@/modules/events/domain/types";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import type { AutomationOutcomeKind } from "@/modules/business-state/domain/types";
import type { AiToolContext } from "@/modules/ai/domain/tool-types";
import type {
  AutonomyActionClass,
  AutonomyDenialReason,
  AutonomyLevel,
  TenantAutonomyPolicy,
} from "@/modules/tenant/domain/autonomy-policy";

export const PROOF_NOOP_WORKFLOW_ID = "proof.noop";
export const COLLECTIONS_REMIND_WORKFLOW_ID = "collections.remind";
export const QUOTATION_FOLLOW_UP_WORKFLOW_ID = "quotations.followup";
export const REORDER_PREPARE_WORKFLOW_ID = "inventory.reorder";
export const EXPENSE_ANOMALY_WORKFLOW_ID = "expenses.anomaly";
export const COLLECTIONS_REMINDER_COOLDOWN_DAYS = 7;
export const EXPANSION_COOLDOWN_DAYS = 7;

export const WORKFLOW_RUN_STATUSES = [
  "PENDING",
  "RUNNING",
  "RETRY",
  "SUCCEEDED",
  "SKIPPED",
  "DEAD_LETTER",
] as const;

export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number];

export const WORKFLOW_STEPS = [
  "EVENT",
  "CONDITION",
  "REASONING",
  "ACTION",
  "RESULT",
  "OUTCOME",
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

/**
 * dry_run: record a completed pipeline without domain mutation (spec 09 proof).
 * execute: call action only after L4 policy allows. L3 confirm stays off this path.
 */
export const WORKFLOW_MODES = ["dry_run", "execute"] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

/**
 * When L4 execute is denied, skip (default) or still run action in prepare
 * mode (`l4Allowed: false`) so collections can draft without sending.
 */
export const WORKFLOW_L4_DENIED_BEHAVIORS = ["skip", "prepare"] as const;
export type WorkflowL4DeniedBehavior = (typeof WORKFLOW_L4_DENIED_BEHAVIORS)[number];

export const WORKFLOW_MAX_ATTEMPTS = 5;
export const WORKFLOW_BACKOFF_BASE_MS = 1_000;
export const WORKFLOW_BACKOFF_MAX_MS = 15 * 60 * 1_000;

export type WorkflowConditionResult =
  | { match: false; reason: string }
  | { match: true; amountMajor?: string | null };

export type WorkflowReasoning = {
  summary: string;
  details?: Record<string, unknown>;
};

export type WorkflowActionResult = {
  executed: boolean;
  dryRun?: boolean;
  message?: string;
  payload?: Record<string, unknown>;
};

export type WorkflowRun = {
  id: string;
  tenantId: string;
  workflowId: string;
  triggerEventId: string;
  triggerEventType: string;
  aggregateType: string;
  aggregateId: string;
  triggerPayload: Record<string, unknown>;
  idempotencyKey: string;
  concurrencyKey: string;
  status: WorkflowRunStatus;
  currentStep: WorkflowStep;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  result: Record<string, unknown>;
  outcomeKind: AutomationOutcomeKind | null;
  correlationId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type WorkflowActionContext = {
  tenantId: string;
  event: OutboxEventRecord;
  run: WorkflowRun;
  policy: TenantAutonomyPolicy;
  actorUserId: string | null;
  currency: string;
  timezone: string;
  correlationId?: string;
  idempotencyKey: string;
  /**
   * Runner-set. True only after evaluateL4Autonomy allows execute.
   * Action must not send/mutate when this is false.
   */
  l4Allowed: boolean;
  l4DeniedReason?: AutonomyDenialReason | null;
  attention: AttentionQueueRepository;
  toolContext: AiToolContext | null;
};

/**
 * Registered automation. Collections (spec 10) registers through the same
 * `registerWorkflow` plugin point — do not post journals or stock here.
 */
export type WorkflowDefinition = {
  id: string;
  label: string;
  eventTypes: readonly string[];
  autonomyLevel: AutonomyLevel;
  actionClass?: AutonomyActionClass;
  mode: WorkflowMode;
  /** Default `skip`. Collections uses `prepare` so L3 still drafts when L4 is off. */
  onL4Denied?: WorkflowL4DeniedBehavior;
  /** Cheap pre-filter before enqueue. Default: event type is in `eventTypes`. */
  accepts?(event: OutboxEventRecord): boolean;
  concurrencyKey?(event: OutboxEventRecord): string;
  idempotencyKey?(event: OutboxEventRecord): string;
  condition(
    event: OutboxEventRecord,
    context: WorkflowActionContext
  ): Promise<WorkflowConditionResult>;
  reason?(
    event: OutboxEventRecord,
    context: WorkflowActionContext
  ): Promise<WorkflowReasoning>;
  /**
   * Domain side effects belong in existing use cases + authz. The runner
   * calls this only for dry_run, or for execute after `evaluateL4Autonomy`.
   */
  action(
    event: OutboxEventRecord,
    context: WorkflowActionContext
  ): Promise<WorkflowActionResult>;
};

export type CreateWorkflowRunInput = {
  tenantId: string;
  workflowId: string;
  triggerEventId: string;
  triggerEventType: string;
  aggregateType: string;
  aggregateId: string;
  triggerPayload: Record<string, unknown>;
  idempotencyKey: string;
  concurrencyKey: string;
  correlationId?: string | null;
};

export type WorkflowRunUpdate = {
  status: WorkflowRunStatus;
  currentStep: WorkflowStep;
  nextAttemptAt?: Date;
  lastError?: string | null;
  result?: Record<string, unknown>;
  outcomeKind?: AutomationOutcomeKind | null;
  completedAt?: Date | null;
};

export type ClaimDueWorkflowRunsInput = {
  now: Date;
  limit: number;
  tenantId?: string;
};
