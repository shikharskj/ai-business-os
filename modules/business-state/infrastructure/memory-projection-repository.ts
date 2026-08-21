import type { BusinessStateProjectionRepository } from "@/modules/business-state/domain/projection-repository";
import type {
  BusinessStateMetaSnapshot,
  InventoryRiskSnapshot,
  ReceivablesRiskSnapshot,
  SalesMomentumSnapshot,
} from "@/modules/business-state/domain/types";
import { BUSINESS_STATE_SCHEMA_VERSION } from "@/modules/business-state/domain/types";

export function createMemoryBusinessStateProjectionRepository(): BusinessStateProjectionRepository & {
  receivables: Map<string, ReceivablesRiskSnapshot>;
  inventory: Map<string, InventoryRiskSnapshot>;
  sales: Map<string, SalesMomentumSnapshot>;
  meta: Map<string, BusinessStateMetaSnapshot>;
} {
  const receivables = new Map<string, ReceivablesRiskSnapshot>();
  const inventory = new Map<string, InventoryRiskSnapshot>();
  const sales = new Map<string, SalesMomentumSnapshot>();
  const meta = new Map<string, BusinessStateMetaSnapshot>();

  return {
    receivables,
    inventory,
    sales,
    meta,
    async upsertReceivablesRisk(snapshot) {
      receivables.set(snapshot.tenantId, snapshot);
    },
    async upsertInventoryRisk(snapshot) {
      inventory.set(snapshot.tenantId, snapshot);
    },
    async upsertSalesMomentum(snapshot) {
      sales.set(snapshot.tenantId, snapshot);
    },
    async touchMeta({ tenantId, schemaVersion, rebuiltAt }) {
      const existing = meta.get(tenantId);
      meta.set(tenantId, {
        tenantId,
        schemaVersion: schemaVersion ?? BUSINESS_STATE_SCHEMA_VERSION,
        rebuiltAt:
          rebuiltAt !== undefined
            ? rebuiltAt
            : (existing?.rebuiltAt ?? null),
        updatedAt: new Date(),
      });
    },
    async getReceivablesRisk(tenantId) {
      return receivables.get(tenantId) ?? null;
    },
    async getInventoryRisk(tenantId) {
      return inventory.get(tenantId) ?? null;
    },
    async getSalesMomentum(tenantId) {
      return sales.get(tenantId) ?? null;
    },
    async getMeta(tenantId) {
      return meta.get(tenantId) ?? null;
    },
  };
}
