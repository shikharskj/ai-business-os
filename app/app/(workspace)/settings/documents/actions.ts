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
import {
  BUSINESS_LOGO_MAX_BYTES,
  clearBusinessLogo,
  setBusinessLogo,
} from "@/modules/tenant";
import {
  prismaBusinessRepository,
} from "@/modules/tenant/infrastructure/prisma-repositories";
import { TenantError } from "@/modules/tenant/domain/errors";

export type DocumentActionState = {
  error?: string;
};

const audit = createPrismaAuditRepository(prisma);

function revalidateLogoSurfaces() {
  revalidatePath("/app/settings");
  revalidatePath("/app/sales/invoices", "layout");
  revalidatePath("/app/sales/quotations", "layout");
}

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

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return { error: `File size exceeds the ${maxBytes / (1024 * 1024)} MB limit.` };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    await uploadDocument({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      ownerRecordType: "BUSINESS",
      ownerRecordId: tenant.tenantId,
      filename: file.name,
      bytes,
      maxBytes,
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

    console.error("Upload document error:", error);
    return { error: "Unable to upload document." };
  }
}

export async function deleteBusinessDocumentAction(
  documentId: string
): Promise<DocumentActionState> {
  try {
    const tenant = await authorize("document:delete");

    if (tenant.business.logoDocumentId === documentId) {
      const wasCleared = await prismaBusinessRepository.clearLogoDocumentIdIfMatches(
        tenant.tenantId,
        documentId
      );
      if (wasCleared) {
        revalidateLogoSurfaces();
      }
    }

    await deleteDocument({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      documentId,
      documents: prismaDocumentRepository,
      storage: getStorageAdapter(),
      audit,
    });

    revalidatePath("/app/settings/documents");
    revalidatePath("/app/settings");
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to remove this document." };
    }

    if (error instanceof DocumentError) {
      return { error: error.message };
    }

    console.error("Delete document error:", error);
    return { error: "Unable to remove document." };
  }
}

export async function uploadBusinessLogoAction(
  _prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  try {
    const tenant = await authorize("settings:update");
    await authorize("document:upload");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { error: "Choose a logo image to upload." };
    }

    if (file.size > BUSINESS_LOGO_MAX_BYTES) {
      return { error: "Logo must be 2 MB or smaller." };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    await setBusinessLogo({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      filename: file.name,
      bytes,
      business: prismaBusinessRepository,
      documents: prismaDocumentRepository,
      storage: getStorageAdapter(),
      audit,
    });

    revalidateLogoSurfaces();
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to update the logo." };
    }
    if (error instanceof DocumentError || error instanceof TenantError) {
      return { error: error.message };
    }
    return { error: "Unable to upload logo." };
  }
}

export async function removeBusinessLogoAction(): Promise<DocumentActionState> {
  try {
    const tenant = await authorize("settings:update");
    await authorize("document:delete");
    await clearBusinessLogo({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      business: prismaBusinessRepository,
      documents: prismaDocumentRepository,
      storage: getStorageAdapter(),
      audit,
    });
    revalidateLogoSurfaces();
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to remove the logo." };
    }
    if (error instanceof DocumentError || error instanceof TenantError) {
      return { error: error.message };
    }
    return { error: "Unable to remove logo." };
  }
}
