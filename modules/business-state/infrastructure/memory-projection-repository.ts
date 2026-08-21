import type {
  BusinessStateProjectionRepository,
  CommitBusinessStateSnapshotsInput,
} from "@/modules/business-state/domain/projection-repository";
import type {
  BusinessStateMetaSnapshot,
  CashPositionSnapshot,
  InventoryRiskSnapshot,
  ReceivablesRiskSnapshot,
  SalesMomentumSnapshot,
} from "@/modules/business-state/domain/types";
import { BUSINESS_STATE_SCHEMA_VERSION } from "@/modules/business-state/domain/types";

function shouldApplySnapshot(
  existingComputedAt: Date | undefined,
  incoming: Date
): boolean {
  return !existingComputedAt || existingComputedAt < incoming;
}

export function createMemoryBusinessStateProjectionRepository(): BusinessStateProjectionRepository & {
  receivables: Map<string, ReceivablesRiskSnapshot>;
  inventory: Map<string, InventoryRiskSnapshot>;
  sales: Map<string, SalesMomentumSnapshot>;
  cash: Map<string, CashPositionSnapshot>;
  meta: Map<string, BusinessStateMetaSnapshot>;
  /** Test hook: throw after this many successful family writes inside commitSnapshots. */
  failCommitAfterFamilies: number | null;
} {
  const receivables = new Map<string, ReceivablesRiskSnapshot>();
  const inventory = new Map<string, InventoryRiskSnapshot>();
  const sales = new Map<string, SalesMomentumSnapshot>();
  const cash = new Map<string, CashPositionSnapshot>();
  const meta = new Map<string, BusinessStateMetaSnapshot>();

  function applyReceivables(
    target: Map<string, ReceivablesRiskSnapshot>,
    snapshot: ReceivablesRiskSnapshot
  ): boolean {
    const existing = target.get(snapshot.tenantId);
    if (!shouldApplySnapshot(existing?.computedAt, snapshot.computedAt)) {
      return false;
    }
    target.set(snapshot.tenantId, snapshot);
    return true;
  }

  function applyInventory(
    target: Map<string, InventoryRiskSnapshot>,
    snapshot: InventoryRiskSnapshot
  ): boolean {
    const existing = target.get(snapshot.tenantId);
    if (!shouldApplySnapshot(existing?.computedAt, snapshot.computedAt)) {
      return false;
    }
    target.set(snapshot.tenantId, snapshot);
    return true;
  }

  function applySales(
    target: Map<string, SalesMomentumSnapshot>,
    snapshot: SalesMomentumSnapshot
  ): boolean {
    const existing = target.get(snapshot.tenantId);
    if (!shouldApplySnapshot(existing?.computedAt, snapshot.computedAt)) {
      return false;
    }
    target.set(snapshot.tenantId, snapshot);
    return true;
  }

  function applyCash(
    target: Map<string, CashPositionSnapshot>,
    snapshot: CashPositionSnapshot
  ): boolean {
    const existing = target.get(snapshot.tenantId);
    if (!shouldApplySnapshot(existing?.computedAt, snapshot.computedAt)) {
      return false;
    }
    target.set(snapshot.tenantId, snapshot);
    return true;
  }

  function applyMeta(
    target: Map<string, BusinessStateMetaSnapshot>,
    input: {
      tenantId: string;
      schemaVersion: number;
      rebuiltAt?: Date | null;
    }
  ): void {
    const existing = target.get(input.tenantId);
    target.set(input.tenantId, {
      tenantId: input.tenantId,
      schemaVersion: input.schemaVersion ?? BUSINESS_STATE_SCHEMA_VERSION,
      rebuiltAt:
        input.rebuiltAt !== undefined
          ? input.rebuiltAt
          : (existing?.rebuiltAt ?? null),
      updatedAt: new Date(),
    });
  }

  const repo = {
    receivables,
    inventory,
    sales,
    cash,
    meta,
    failCommitAfterFamilies: null as number | null,

    async upsertReceivablesRisk(snapshot: ReceivablesRiskSnapshot) {
      applyReceivables(receivables, snapshot);
    },
    async upsertInventoryRisk(snapshot: InventoryRiskSnapshot) {
      applyInventory(inventory, snapshot);
    },
    async upsertSalesMomentum(snapshot: SalesMomentumSnapshot) {
      applySales(sales, snapshot);
    },
    async upsertCashPosition(snapshot: CashPositionSnapshot) {
      applyCash(cash, snapshot);
    },
    async touchMeta(input: {
      tenantId: string;
      schemaVersion: number;
      rebuiltAt?: Date | null;
    }) {
      applyMeta(meta, input);
    },

    async commitSnapshots(input: CommitBusinessStateSnapshotsInput) {
      const nextReceivables = new Map(receivables);
      const nextInventory = new Map(inventory);
      const nextSales = new Map(sales);
      const nextCash = new Map(cash);
      const nextMeta = new Map(meta);
      let appliedFamilies = 0;

      if (input.receivablesRisk) {
        if (applyReceivables(nextReceivables, input.receivablesRisk)) {
          appliedFamilies += 1;
          if (
            repo.failCommitAfterFamilies !== null &&
            appliedFamilies >= repo.failCommitAfterFamilies
          ) {
            throw new Error("Simulated commit failure");
          }
        }
      }
      if (input.inventoryRisk) {
        if (applyInventory(nextInventory, input.inventoryRisk)) {
          appliedFamilies += 1;
          if (
            repo.failCommitAfterFamilies !== null &&
            appliedFamilies >= repo.failCommitAfterFamilies
          ) {
            throw new Error("Simulated commit failure");
          }
        }
      }
      if (input.salesMomentum) {
        if (applySales(nextSales, input.salesMomentum)) {
          appliedFamilies += 1;
          if (
            repo.failCommitAfterFamilies !== null &&
            appliedFamilies >= repo.failCommitAfterFamilies
          ) {
            throw new Error("Simulated commit failure");
          }
        }
      }
      if (input.cashPosition) {
        if (applyCash(nextCash, input.cashPosition)) {
          appliedFamilies += 1;
          if (
            repo.failCommitAfterFamilies !== null &&
            appliedFamilies >= repo.failCommitAfterFamilies
          ) {
            throw new Error("Simulated commit failure");
          }
        }
      }

      if (appliedFamilies > 0 || input.rebuiltAt !== undefined) {
        applyMeta(nextMeta, {
          tenantId: input.tenantId,
          schemaVersion: input.schemaVersion,
          rebuiltAt: input.rebuiltAt,
        });
      }

      receivables.clear();
      for (const [k, v] of nextReceivables) receivables.set(k, v);
      inventory.clear();
      for (const [k, v] of nextInventory) inventory.set(k, v);
      sales.clear();
      for (const [k, v] of nextSales) sales.set(k, v);
      cash.clear();
      for (const [k, v] of nextCash) cash.set(k, v);
      meta.clear();
      for (const [k, v] of nextMeta) meta.set(k, v);

      return { appliedFamilies };
    },

    async getReceivablesRisk(tenantId: string) {
      return receivables.get(tenantId) ?? null;
    },
    async getInventoryRisk(tenantId: string) {
      return inventory.get(tenantId) ?? null;
    },
    async getSalesMomentum(tenantId: string) {
      return sales.get(tenantId) ?? null;
    },
    async getCashPosition(tenantId: string) {
      return cash.get(tenantId) ?? null;
    },
    async getMeta(tenantId: string) {
      return meta.get(tenantId) ?? null;
    },
  };

  return repo;
}
