import { authorize } from "@/lib/security";
import { csvResponse, reportExportErrorResponse } from "@/lib/reports/csv-response";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { exportInventoryCsv } from "@/modules/reporting";

export async function GET() {
  try {
    const tenant = await authorize("report:read");
    const { filename, csv } = await exportInventoryCsv({
      tenantId: tenant.tenantId,
      timezone: tenant.business.timezone,
      catalog: prismaCatalogRepository,
      inventory: prismaInventoryRepository,
      lowStockThresholdMajor: tenant.business.lowStockThreshold,
    });
    return csvResponse(filename, csv);
  } catch (error) {
    return reportExportErrorResponse(error);
  }
}
