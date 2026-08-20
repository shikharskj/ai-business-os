import type { TenantContext } from "@/modules/tenant/domain/types";
import type { PurchaseTaxContext } from "@/modules/purchases/domain/types";

export function taxContextFromTenant(tenant: TenantContext): PurchaseTaxContext {
  return {
    gstin: tenant.business.gstin,
    gstRegistrationStatus: tenant.business.gstRegistrationStatus,
    stateName: tenant.business.state,
    defaultGstRateBps: tenant.business.defaultGstRateBps,
    financialYearStartMonth: tenant.business.financialYearStartMonth,
    currency: tenant.business.currency,
  };
}
