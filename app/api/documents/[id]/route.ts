import { NextResponse } from "next/server";

import { authorize, AuthorizationError } from "@/lib/security";
import { getStorageAdapter } from "@/lib/storage";
import {
  DocumentError,
  DocumentNotFoundError,
  downloadDocument,
} from "@/modules/documents";
import { prismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document-repository";

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await authorize("document:read");
    const { id } = await context.params;
    const { record, body } = await downloadDocument({
      tenantId: tenant.tenantId,
      documentId: id,
      documents: prismaDocumentRepository,
      storage: getStorageAdapter(),
    });

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": record.contentType,
        "Content-Disposition": contentDisposition(record.filename),
        "Content-Length": String(body.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: "Document was not found." }, { status: 404 });
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof DocumentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
