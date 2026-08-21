import type {
  BusinessStateMetaSnapshot,
  InventoryRiskSnapshot,
  ReceivablesRiskSnapshot,
  SalesMomentumSnapshot,
} from "@/modules/business-state/domain/types";

export type BusinessStateProjectionRepository = {
  upsertReceivablesRisk(snapshot: ReceivablesRiskSnapshot): Promise<void>;
  upsertInventoryRisk(snapshot: InventoryRiskSnapshot): Promise<void>;
  upsertSalesMomentum(snapshot: SalesMomentumSnapshot): Promise<void>;
  touchMeta(input: {
    tenantId: string;
    schemaVersion: number;
    rebuiltAt?: Date | null;
  }): Promise<void>;
  getReceivablesRisk(tenantId: string): Promise<ReceivablesRiskSnapshot | null>;
  getInventoryRisk(tenantId: string): Promise<InventoryRiskSnapshot | null>;
  getSalesMomentum(tenantId: string): Promise<SalesMomentumSnapshot | null>;
  getMeta(tenantId: string): Promise<BusinessStateMetaSnapshot | null>;
};
