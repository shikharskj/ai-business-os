import { authorize } from "@/lib/security";
import { csvResponse, reportExportErrorResponse } from "@/lib/reports/csv-response";
import { prismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { exportPayablesCsv } from "@/modules/reporting";

export async function GET() {
  try {
    const tenant = await authorize("report:read");
    const { filename, csv } = await exportPayablesCsv({
      tenantId: tenant.tenantId,
      timezone: tenant.business.timezone,
      purchases: prismaPurchasesRepository,
      supplierPayments: prismaSupplierPaymentRepository,
    });
    return csvResponse(filename, csv);
  } catch (error) {
    return reportExportErrorResponse(error);
  }
}
