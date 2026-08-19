"use server";

import { revalidatePath } from "next/cache";

import { authorize, AuthorizationError } from "@/lib/security";
import { getStorageAdapter } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import {
  deleteDocument,
  DocumentError,
  uploadDocument,
} from "@/modules/documents";
import { prismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document-repository";

export type DocumentActionState = {
  error?: string;
};

const audit = createPrismaAuditRepository(prisma);

export async function uploadBusinessDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  try {
    const tenant = await authorize("document:upload");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { error: "Choose a file to upload." };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    await uploadDocument({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      ownerRecordType: "BUSINESS",
      ownerRecordId: tenant.tenantId,
      filename: file.name,
      bytes,
      maxBytes: 10 * 1024 * 1024,
      storage: getStorageAdapter(),
      documents: prismaDocumentRepository,
      audit,
    });

    revalidatePath("/app/settings/documents");
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to upload documents." };
    }

    if (error instanceof DocumentError) {
      return { error: error.message };
    }

    return {
      error:
        error instanceof Error ? error.message : "Unable to upload document.",
    };
  }
}

export async function deleteBusinessDocumentAction(
  documentId: string
): Promise<DocumentActionState> {
  try {
    const tenant = await authorize("document:delete");

    await deleteDocument({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      documentId,
      documents: prismaDocumentRepository,
      storage: getStorageAdapter(),
      audit,
    });

    revalidatePath("/app/settings/documents");
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to remove this document." };
    }

    if (error instanceof DocumentError) {
      return { error: error.message };
    }

    return {
      error:
        error instanceof Error ? error.message : "Unable to remove document.",
    };
  }
}
