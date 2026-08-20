import { NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/security";
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
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof ReportingError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  throw error;
}
