import { NextResponse } from "next/server";

import { authorize, AuthorizationError } from "@/lib/security";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import {
  exportGstCsv,
  gstSummarySearchSchema,
  ReportingError,
} from "@/modules/reporting";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { periodKeyFromDate } from "@/modules/accounting";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorize("report:read");
    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period");
    const currentPeriod = periodKeyFromDate(
      todayInTimezone(tenant.business.timezone)
    );
    const parsed = gstSummarySearchSchema.safeParse({
      period: periodParam ?? currentPeriod,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid period. Expected YYYY-MM." },
        { status: 400 }
      );
    }

    const { filename, csv } = await exportGstCsv({
      tenantId: tenant.tenantId,
      periodKey: parsed.data.period,
      sales: prismaSalesRepository,
      purchases: prismaPurchasesRepository,
      expenses: prismaExpenseRepository,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof ReportingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
