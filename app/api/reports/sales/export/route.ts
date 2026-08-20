import { authorize } from "@/lib/security";
import { csvResponse, reportExportErrorResponse } from "@/lib/reports/csv-response";
import { resolveReportRange } from "@/lib/reports/report-range";
import { exportSalesCsv } from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export async function GET(request: Request) {
  try {
    const tenant = await authorize("report:read");
    const url = new URL(request.url);
    const { range, error } = await resolveReportRange({
      timezone: tenant.business.timezone,
      range: url.searchParams.get("range") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    if (error) {
      return Response.json({ error }, { status: 400 });
    }

    const { filename, csv } = await exportSalesCsv({
      tenantId: tenant.tenantId,
      range,
      sales: prismaSalesRepository,
    });
    return csvResponse(filename, csv);
  } catch (error) {
    return reportExportErrorResponse(error);
  }
}
