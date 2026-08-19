import type { DocumentRecord, DocumentOwnerType } from "@/modules/documents/domain/types";

export type CreateDocumentRecordInput = Omit<DocumentRecord, "createdAt"> & {
  createdAt?: Date;
};

export type DocumentRepository = {
  create(input: CreateDocumentRecordInput): Promise<DocumentRecord>;
  findById(tenantId: string, documentId: string): Promise<DocumentRecord | null>;
  listForOwner(input: {
    tenantId: string;
    ownerRecordType: DocumentOwnerType;
    ownerRecordId: string;
  }): Promise<DocumentRecord[]>;
  delete(tenantId: string, documentId: string): Promise<DocumentRecord | null>;
};

export function createMemoryDocumentRepository(
  initial: DocumentRecord[] = []
): DocumentRepository & { records: DocumentRecord[] } {
  const records = [...initial];

  return {
    records,
    async create(input) {
      const record: DocumentRecord = {
        ...input,
        createdAt: input.createdAt ?? new Date(),
      };
      records.push(record);
      return record;
    },
    async findById(tenantId, documentId) {
      return (
        records.find(
          (record) => record.tenantId === tenantId && record.id === documentId
        ) ?? null
      );
    },
    async listForOwner(input) {
      return records
        .filter(
          (record) =>
            record.tenantId === input.tenantId &&
            record.ownerRecordType === input.ownerRecordType &&
            record.ownerRecordId === input.ownerRecordId
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async delete(tenantId, documentId) {
      const index = records.findIndex(
        (record) => record.tenantId === tenantId && record.id === documentId
      );
      if (index === -1) {
        return null;
      }

      const [removed] = records.splice(index, 1);
      return removed ?? null;
    },
  };
}
