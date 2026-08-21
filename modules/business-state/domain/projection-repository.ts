import type {
  BusinessStateMetaSnapshot,
  InventoryRiskSnapshot,
  ReceivablesRiskSnapshot,
  SalesMomentumSnapshot,
} from "@/modules/business-state/domain/types";

export type CommitBusinessStateSnapshotsInput = {
  tenantId: string;
  schemaVersion: number;
  /** Tri-state: omit = leave existing; null/Date = set. */
  rebuiltAt?: Date | null;
  receivablesRisk?: ReceivablesRiskSnapshot;
  inventoryRisk?: InventoryRiskSnapshot;
  salesMomentum?: SalesMomentumSnapshot;
};

export type BusinessStateProjectionRepository = {
  upsertReceivablesRisk(snapshot: ReceivablesRiskSnapshot): Promise<void>;
  upsertInventoryRisk(snapshot: InventoryRiskSnapshot): Promise<void>;
  upsertSalesMomentum(snapshot: SalesMomentumSnapshot): Promise<void>;
  touchMeta(input: {
    tenantId: string;
    schemaVersion: number;
    rebuiltAt?: Date | null;
  }): Promise<void>;
  /**
   * Atomically commit selected family snapshots + meta.
   * Family writes apply only when missing or existing.computedAt < snapshot.computedAt.
   * Meta updates when any family applied or rebuiltAt is explicitly provided.
   */
  commitSnapshots(
    input: CommitBusinessStateSnapshotsInput
  ): Promise<{ appliedFamilies: number }>;
  getReceivablesRisk(tenantId: string): Promise<ReceivablesRiskSnapshot | null>;
  getInventoryRisk(tenantId: string): Promise<InventoryRiskSnapshot | null>;
  getSalesMomentum(tenantId: string): Promise<SalesMomentumSnapshot | null>;
  getMeta(tenantId: string): Promise<BusinessStateMetaSnapshot | null>;
};
