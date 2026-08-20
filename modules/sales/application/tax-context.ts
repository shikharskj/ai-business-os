import type { TenantContext } from "@/modules/tenant/domain/types";
import type { QuotationTaxContext } from "@/modules/sales/domain/types";

export function taxContextFromTenant(tenant: TenantContext): QuotationTaxContext {
  return {
    gstin: tenant.business.gstin,
    gstRegistrationStatus: tenant.business.gstRegistrationStatus,
    stateName: tenant.business.state,
    defaultGstRateBps: tenant.business.defaultGstRateBps,
    financialYearStartMonth: tenant.business.financialYearStartMonth,
    currency: tenant.business.currency,
  };
}
