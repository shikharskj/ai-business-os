import { NextResponse } from "next/server";

import { authzErrorResponse } from "@/lib/http/auth-errors";
import { authorize } from "@/lib/security";
import { getStorageAdapter } from "@/lib/storage";
import {
  DocumentError,
  DocumentNotFoundError,
  downloadDocument,
} from "@/modules/documents";
import { prismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document-repository";

function contentDisposition(filename: string, inline: boolean): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(filename);
  const disposition = inline ? "inline" : "attachment";
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
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

    const inline = record.contentType.startsWith("image/");
    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": record.contentType,
        "Content-Disposition": contentDisposition(record.filename, inline),
        "Content-Length": String(body.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const authz = authzErrorResponse(error);
    if (authz) {
      return authz;
    }

    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: "Document was not found." }, { status: 404 });
    }

    if (error instanceof DocumentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
