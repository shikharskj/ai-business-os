import "server-only";

import { prisma } from "@/lib/db";
import type { AllowedDocumentContentType, DocumentRecord } from "@/modules/documents/domain/types";
import { isAllowedContentType, isDocumentOwnerType } from "@/modules/documents/domain/inspect-upload";
import type {
  DocumentRepository,
} from "@/modules/documents/infrastructure/repositories";

function mapDocument(record: {
  id: string;
  tenantId: string;
  ownerRecordType: string;
  ownerRecordId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedByUserId: string;
  createdAt: Date;
}): DocumentRecord {
  if (!isDocumentOwnerType(record.ownerRecordType)) {
    throw new Error(`Unknown document owner type: ${record.ownerRecordType}`);
  }

  if (!isAllowedContentType(record.contentType)) {
    throw new Error(`Unknown document content type: ${record.contentType}`);
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    ownerRecordType: record.ownerRecordType,
    ownerRecordId: record.ownerRecordId,
    filename: record.filename,
    contentType: record.contentType as AllowedDocumentContentType,
    sizeBytes: record.sizeBytes,
    storageKey: record.storageKey,
    uploadedByUserId: record.uploadedByUserId,
    createdAt: record.createdAt,
  };
}

export const prismaDocumentRepository: DocumentRepository = {
  async create(input) {
    const record = await prisma.document.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        ownerRecordType: input.ownerRecordType,
        ownerRecordId: input.ownerRecordId,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        uploadedByUserId: input.uploadedByUserId,
        createdAt: input.createdAt,
      },
    });
    return mapDocument(record);
  },

  async findById(tenantId, documentId) {
    const record = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });
    return record ? mapDocument(record) : null;
  },

  async listForOwner(input) {
    const records = await prisma.document.findMany({
      where: {
        tenantId: input.tenantId,
        ownerRecordType: input.ownerRecordType,
        ownerRecordId: input.ownerRecordId,
      },
      orderBy: { createdAt: "desc" },
    });
    return records.map(mapDocument);
  },

  async delete(tenantId, documentId) {
    try {
      const record = await prisma.document.delete({
        where: {
          id_tenantId: {
            id: documentId,
            tenantId,
          },
        },
      });
      return mapDocument(record);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        return null;
      }
      throw error;
    }
  },
};
