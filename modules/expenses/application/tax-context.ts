import type { TenantContext } from "@/modules/tenant/domain/types";
import type { ExpenseTaxContext } from "@/modules/expenses/domain/types";

export function expenseTaxContextFromTenant(tenant: TenantContext): ExpenseTaxContext {
  return {
    gstin: tenant.business.gstin,
    gstRegistrationStatus: tenant.business.gstRegistrationStatus,
    stateName: tenant.business.state,
    defaultGstRateBps: tenant.business.defaultGstRateBps,
    financialYearStartMonth: tenant.business.financialYearStartMonth,
    currency: tenant.business.currency,
  };
}
