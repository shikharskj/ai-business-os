import type {
  AttentionQueueRepository,
  DismissAttentionRecordInput,
  ListAutomationOutcomesFilter,
  RecordAutomationOutcomeInput,
  SyncAttentionItemsInput,
} from "@/modules/business-state/domain/attention-repository";
import type {
  AttentionItem,
  AttentionItemStatus,
  AutomationOutcome,
} from "@/modules/business-state/domain/types";

function cloneItem(item: AttentionItem): AttentionItem {
  return {
    ...item,
    amount: item.amount ? { ...item.amount } : null,
  };
}

function cloneOutcome(outcome: AutomationOutcome): AutomationOutcome {
  return {
    ...outcome,
    payload: { ...outcome.payload },
  };
}

export function createMemoryAttentionQueueRepository(): AttentionQueueRepository & {
  items: AttentionItem[];
  outcomes: AutomationOutcome[];
} {
  const items: AttentionItem[] = [];
  const outcomes: AutomationOutcome[] = [];

  function findIndex(tenantId: string, id: string) {
    return items.findIndex(
      (item) => item.tenantId === tenantId && item.id === id
    );
  }

  function findByKeyIndex(tenantId: string, naturalKey: string) {
    return items.findIndex(
      (item) => item.tenantId === tenantId && item.naturalKey === naturalKey
    );
  }

  return {
    items,
    outcomes,

    async syncItems(input: SyncAttentionItemsInput) {
      const keys = new Set(input.items.map((draft) => draft.naturalKey));
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i]!;
        if (item.tenantId !== input.tenantId) continue;
        if (!keys.has(item.naturalKey)) {
          items.splice(i, 1);
        }
      }

      for (const draft of input.items) {
        const index = findByKeyIndex(input.tenantId, draft.naturalKey);
        const now = input.computedAt;
        if (index >= 0) {
          const existing = items[index]!;
          items[index] = {
            ...existing,
            type: draft.type,
            severity: draft.severity,
            title: draft.title,
            body: draft.body,
            href: draft.href,
            resourceType: draft.resourceType,
            resourceId: draft.resourceId,
            amount: draft.amount,
            currency: draft.currency,
            factId: draft.factId,
            computedAt: now,
            updatedAt: now,
          };
        } else {
          items.push({
            id: crypto.randomUUID(),
            tenantId: input.tenantId,
            naturalKey: draft.naturalKey,
            type: draft.type,
            severity: draft.severity,
            status: "OPEN",
            title: draft.title,
            body: draft.body,
            href: draft.href,
            resourceType: draft.resourceType,
            resourceId: draft.resourceId,
            amount: draft.amount,
            currency: draft.currency,
            factId: draft.factId,
            computedAt: now,
            dismissedAt: null,
            dismissedByUserId: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    },

    async listOpen(tenantId: string) {
      return items
        .filter((item) => item.tenantId === tenantId && item.status === "OPEN")
        .sort((a, b) => {
          if (b.severity !== a.severity) return b.severity - a.severity;
          return b.computedAt.getTime() - a.computedAt.getTime();
        })
        .map(cloneItem);
    },

    async countOpen(tenantId: string) {
      return items.filter(
        (item) => item.tenantId === tenantId && item.status === "OPEN"
      ).length;
    },

    async findById(tenantId: string, id: string) {
      const item = items.find(
        (row) => row.tenantId === tenantId && row.id === id
      );
      return item ? cloneItem(item) : null;
    },

    async findByNaturalKey(tenantId: string, naturalKey: string) {
      const item = items.find(
        (row) => row.tenantId === tenantId && row.naturalKey === naturalKey
      );
      return item ? cloneItem(item) : null;
    },

    async dismiss(input: DismissAttentionRecordInput) {
      const index = findIndex(input.tenantId, input.id);
      if (index < 0) return null;
      const existing = items[index]!;
      const previousStatus: AttentionItemStatus = existing.status;
      if (existing.status === "DISMISSED") {
        return { item: cloneItem(existing), previousStatus };
      }
      const updated: AttentionItem = {
        ...existing,
        status: "DISMISSED",
        dismissedAt: input.dismissedAt,
        dismissedByUserId: input.dismissedByUserId,
        updatedAt: input.dismissedAt,
      };
      items[index] = updated;
      return { item: cloneItem(updated), previousStatus };
    },

    async recordOutcome(input: RecordAutomationOutcomeInput) {
      const existing = outcomes.find(
        (row) =>
          row.tenantId === input.tenantId &&
          row.idempotencyKey === input.idempotencyKey
      );
      if (existing) {
        return { created: false, outcome: cloneOutcome(existing) };
      }
      const outcome: AutomationOutcome = {
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        kind: input.kind,
        attentionItemId: input.attentionItemId ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        payload: input.payload ?? {},
        idempotencyKey: input.idempotencyKey,
        recordedAt: new Date(),
      };
      outcomes.push(outcome);
      return { created: true, outcome: cloneOutcome(outcome) };
    },

    async listOutcomes(filter: ListAutomationOutcomesFilter) {
      return outcomes
        .filter((row) => row.tenantId === filter.tenantId)
        .filter((row) => (filter.kind ? row.kind === filter.kind : true))
        .filter((row) =>
          filter.resourceType ? row.resourceType === filter.resourceType : true
        )
        .filter((row) =>
          filter.resourceIds
            ? Boolean(row.resourceId && filter.resourceIds.includes(row.resourceId))
            : true
        )
        .map(cloneOutcome);
    },
  };
}
