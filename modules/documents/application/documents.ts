import { buildTenantStorageKey } from "@/lib/storage/keys";
import type { StorageAdapter } from "@/lib/storage/types";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import { DocumentNotFoundError, DocumentValidationError } from "@/modules/documents/domain/errors";
import { inspectUploadBytes, isDocumentOwnerType } from "@/modules/documents/domain/inspect-upload";
import type {
  DocumentOwnerType,
  DocumentRecord,
} from "@/modules/documents/domain/types";
import type { DocumentRepository } from "@/modules/documents/infrastructure/repositories";

export type UploadDocumentInput = {
  tenantId: string;
  actorUserId: string;
  ownerRecordType: string;
  ownerRecordId: string;
  filename: string;
  bytes: Uint8Array;
  maxBytes?: number;
  storage: StorageAdapter;
  documents: DocumentRepository;
  audit: AuditRepository;
};

function requireOwnerType(value: string): DocumentOwnerType {
  if (!isDocumentOwnerType(value)) {
    throw new DocumentValidationError("Unknown document owner type.");
  }

  return value;
}

function requireOwnerRecordId(
  tenantId: string,
  ownerRecordType: DocumentOwnerType,
  ownerRecordId: string
): string {
  const trimmed = ownerRecordId.trim();
  if (!trimmed) {
    throw new DocumentValidationError("Owner record is required.");
  }

  if (ownerRecordType === "BUSINESS" && trimmed !== tenantId) {
    throw new DocumentValidationError(
      "Business documents must belong to the current workspace."
    );
  }

  return trimmed;
}

export async function uploadDocument(
  input: UploadDocumentInput
): Promise<DocumentRecord> {
  const ownerRecordType = requireOwnerType(input.ownerRecordType);
  const ownerRecordId = requireOwnerRecordId(
    input.tenantId,
    ownerRecordType,
    input.ownerRecordId
  );
  const inspected = inspectUploadBytes({
    filename: input.filename,
    bytes: input.bytes,
    maxBytes: input.maxBytes,
  });

  const id = crypto.randomUUID();
  const storageKey = buildTenantStorageKey({
    tenantId: input.tenantId,
    ownerRecordType,
    objectId: id,
  });

  await input.storage.upload({
    key: storageKey,
    body: input.bytes,
    contentType: inspected.contentType,
  });

  let record: DocumentRecord;
  try {
    record = await input.documents.create({
      id,
      tenantId: input.tenantId,
      ownerRecordType,
      ownerRecordId,
      filename: inspected.filename,
      contentType: inspected.contentType,
      sizeBytes: inspected.sizeBytes,
      storageKey,
      uploadedByUserId: input.actorUserId,
    });
  } catch (error) {
    try {
      await input.storage.delete(storageKey);
    } catch (deleteError) {
      // Log but don't mask the original error
      console.error("Failed to delete storage after document creation failure:", deleteError);
    }
    throw error;
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "document.uploaded",
    resource: "document",
    resourceId: record.id,
    metadata: {
      ownerRecordType,
      ownerRecordId,
      filename: inspected.filename,
      contentType: inspected.contentType,
      sizeBytes: inspected.sizeBytes,
    },
  });

  return record;
}

export async function getDocumentForTenant(input: {
  tenantId: string;
  documentId: string;
  documents: DocumentRepository;
}): Promise<DocumentRecord> {
  const record = await input.documents.findById(input.tenantId, input.documentId);
  if (!record) {
    throw new DocumentNotFoundError();
  }

  return record;
}

export async function downloadDocument(input: {
  tenantId: string;
  documentId: string;
  documents: DocumentRepository;
  storage: StorageAdapter;
}): Promise<{ record: DocumentRecord; body: Uint8Array }> {
  const record = await getDocumentForTenant(input);
  const stored = await input.storage.download(record.storageKey);
  return { record, body: stored.body };
}

export async function listDocumentsForOwner(input: {
  tenantId: string;
  ownerRecordType: string;
  ownerRecordId: string;
  documents: DocumentRepository;
}): Promise<DocumentRecord[]> {
  const ownerRecordType = requireOwnerType(input.ownerRecordType);
  const ownerRecordId = requireOwnerRecordId(
    input.tenantId,
    ownerRecordType,
    input.ownerRecordId
  );

  return input.documents.listForOwner({
    tenantId: input.tenantId,
    ownerRecordType,
    ownerRecordId,
  });
}

export async function deleteDocument(input: {
  tenantId: string;
  actorUserId: string;
  documentId: string;
  documents: DocumentRepository;
  storage: StorageAdapter;
  audit: AuditRepository;
}): Promise<DocumentRecord> {
  const record = await input.documents.delete(input.tenantId, input.documentId);
  if (!record) {
    throw new DocumentNotFoundError();
  }

  await input.storage.delete(record.storageKey);
  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "document.deleted",
    resource: "document",
    resourceId: record.id,
    metadata: {
      ownerRecordType: record.ownerRecordType,
      ownerRecordId: record.ownerRecordId,
      filename: record.filename,
    },
  });

  return record;
}
