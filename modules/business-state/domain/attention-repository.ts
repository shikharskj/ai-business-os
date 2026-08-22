import type {
  AttentionItem,
  AttentionItemDraft,
  AttentionItemStatus,
  AutomationOutcome,
  AutomationOutcomeKind,
} from "@/modules/business-state/domain/types";

export type SyncAttentionItemsInput = {
  tenantId: string;
  items: AttentionItemDraft[];
  computedAt: Date;
};

export type DismissAttentionRecordInput = {
  tenantId: string;
  id: string;
  dismissedByUserId: string;
  dismissedAt: Date;
};

export type RecordAutomationOutcomeInput = {
  tenantId: string;
  kind: AutomationOutcomeKind;
  idempotencyKey: string;
  attentionItemId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  payload?: Record<string, unknown>;
};

export type ListAutomationOutcomesFilter = {
  tenantId: string;
  kind?: AutomationOutcomeKind;
  kinds?: AutomationOutcomeKind[];
  resourceType?: string;
  resourceIds?: string[];
  recordedAfter?: Date;
};

export type AttentionQueueRepository = {
  /**
   * Upsert current issues by natural key. Preserves DISMISSED while the
   * issue is still present. Deletes rows whose issue has resolved so a
   * later recurrence can surface as OPEN.
   */
  syncItems(input: SyncAttentionItemsInput): Promise<void>;
  listOpen(tenantId: string): Promise<AttentionItem[]>;
  countOpen(tenantId: string): Promise<number>;
  findById(tenantId: string, id: string): Promise<AttentionItem | null>;
  findByNaturalKey(
    tenantId: string,
    naturalKey: string
  ): Promise<AttentionItem | null>;
  dismiss(
    input: DismissAttentionRecordInput
  ): Promise<{ item: AttentionItem; previousStatus: AttentionItemStatus } | null>;
  recordOutcome(
    input: RecordAutomationOutcomeInput
  ): Promise<{ created: boolean; outcome: AutomationOutcome }>;
  listOutcomes(
    filter: ListAutomationOutcomesFilter
  ): Promise<AutomationOutcome[]>;
};
