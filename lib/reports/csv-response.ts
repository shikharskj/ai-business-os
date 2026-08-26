import { NextResponse } from "next/server";

import { authzErrorResponse } from "@/lib/http/auth-errors";
import { ReportingError } from "@/modules/reporting";

export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export function csvResponse(filename: string, csv: string) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": contentDisposition(filename),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function reportExportErrorResponse(error: unknown) {
  const authz = authzErrorResponse(error);
  if (authz) {
    return authz;
  }
  if (error instanceof ReportingError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  throw error;
}
