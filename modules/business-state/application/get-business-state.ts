import type { BusinessStateProjectionRepository } from "@/modules/business-state/domain/projection-repository";
import type { BusinessStateSummary } from "@/modules/business-state/domain/types";

/**
 * Tenant-scoped read of BusinessState projections.
 * Caller must enforce authz (`report:read`) and pass the authorized tenantId.
 */
export async function getBusinessStateSummary(input: {
  tenantId: string;
  projections: BusinessStateProjectionRepository;
}): Promise<BusinessStateSummary> {
  const [meta, receivablesRisk, inventoryRisk, salesMomentum, cashPosition] =
    await Promise.all([
      input.projections.getMeta(input.tenantId),
      input.projections.getReceivablesRisk(input.tenantId),
      input.projections.getInventoryRisk(input.tenantId),
      input.projections.getSalesMomentum(input.tenantId),
      input.projections.getCashPosition(input.tenantId),
    ]);

  if (meta && meta.tenantId !== input.tenantId) {
    throw new Error("Cross-tenant BusinessState meta access rejected");
  }
  if (receivablesRisk && receivablesRisk.tenantId !== input.tenantId) {
    throw new Error("Cross-tenant receivables projection access rejected");
  }
  if (inventoryRisk && inventoryRisk.tenantId !== input.tenantId) {
    throw new Error("Cross-tenant inventory projection access rejected");
  }
  if (salesMomentum && salesMomentum.tenantId !== input.tenantId) {
    throw new Error("Cross-tenant sales momentum projection access rejected");
  }
  if (cashPosition && cashPosition.tenantId !== input.tenantId) {
    throw new Error("Cross-tenant cash position projection access rejected");
  }

  return {
    meta,
    receivablesRisk,
    inventoryRisk,
    salesMomentum,
    cashPosition,
  };
}
