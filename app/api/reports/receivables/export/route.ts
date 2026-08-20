import { authorize } from "@/lib/security";
import { csvResponse, reportExportErrorResponse } from "@/lib/reports/csv-response";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { exportReceivablesCsv } from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export async function GET() {
  try {
    const tenant = await authorize("report:read");
    const { filename, csv } = await exportReceivablesCsv({
      tenantId: tenant.tenantId,
      timezone: tenant.business.timezone,
      sales: prismaSalesRepository,
      payments: prismaPaymentRepository,
    });
    return csvResponse(filename, csv);
  } catch (error) {
    return reportExportErrorResponse(error);
  }
}
