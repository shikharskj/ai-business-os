import type { StorageAdapter } from "@/lib/storage/types";
import {
  deleteDocument,
  DocumentNotFoundError,
  DocumentValidationError,
  inspectUploadBytes,
  uploadDocument,
  type DocumentRepository,
} from "@/modules/documents";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import { TenantError } from "@/modules/tenant/domain/errors";
import type { BusinessProfile } from "@/modules/tenant/domain/types";
import type { BusinessRepository } from "@/modules/tenant/infrastructure/repositories";

export const BUSINESS_LOGO_MAX_BYTES = 2 * 1024 * 1024;

const LOGO_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function businessLogoUrl(documentId: string | null | undefined): string | null {
  if (!documentId) {
    return null;
  }
  return `/api/documents/${documentId}`;
}

export async function setBusinessLogo(input: {
  tenantId: string;
  actorUserId: string;
  filename: string;
  bytes: Uint8Array;
  business: BusinessRepository;
  documents: DocumentRepository;
  storage: StorageAdapter;
  audit: AuditRepository;
}): Promise<BusinessProfile> {
  const inspected = inspectUploadBytes({
    filename: input.filename,
    bytes: input.bytes,
    maxBytes: BUSINESS_LOGO_MAX_BYTES,
  });
  if (!LOGO_CONTENT_TYPES.has(inspected.contentType)) {
    throw new DocumentValidationError("Upload a JPEG, PNG, or WebP logo.");
  }

  const existing = await input.business.findById(input.tenantId);
  if (!existing) {
    throw new TenantError("Business was not found.");
  }

  const previousId = existing.logoDocumentId ?? null;
  const uploaded = await uploadDocument({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    ownerRecordType: "BUSINESS",
    ownerRecordId: input.tenantId,
    filename: input.filename,
    bytes: input.bytes,
    maxBytes: BUSINESS_LOGO_MAX_BYTES,
    storage: input.storage,
    documents: input.documents,
    audit: input.audit,
  });

  const updated = await input.business.setLogoDocumentId(
    input.tenantId,
    uploaded.id
  );

  if (previousId && previousId !== uploaded.id) {
    try {
      await deleteDocument({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        documentId: previousId,
        documents: input.documents,
        storage: input.storage,
        audit: input.audit,
      });
    } catch (error) {
      if (!(error instanceof DocumentNotFoundError)) {
        throw error;
      }
    }
  }

  return updated;
}

export async function clearBusinessLogo(input: {
  tenantId: string;
  actorUserId: string;
  business: BusinessRepository;
  documents: DocumentRepository;
  storage: StorageAdapter;
  audit: AuditRepository;
}): Promise<BusinessProfile> {
  const existing = await input.business.findById(input.tenantId);
  if (!existing) {
    throw new TenantError("Business was not found.");
  }

  const previousId = existing.logoDocumentId ?? null;
  const updated = await input.business.setLogoDocumentId(input.tenantId, null);

  if (previousId) {
    try {
      await deleteDocument({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        documentId: previousId,
        documents: input.documents,
        storage: input.storage,
        audit: input.audit,
      });
    } catch (error) {
      if (!(error instanceof DocumentNotFoundError)) {
        throw error;
      }
    }
  }

  return updated;
}
