export const DOCUMENT_OWNER_TYPES = [
  "BUSINESS",
  "EXPENSE",
  "INVOICE",
  "PURCHASE",
  "PAYMENT",
  "CUSTOMER",
  "SUPPLIER",
  "PRODUCT",
] as const;

export type DocumentOwnerType = (typeof DOCUMENT_OWNER_TYPES)[number];

export const ALLOWED_DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedDocumentContentType =
  (typeof ALLOWED_DOCUMENT_CONTENT_TYPES)[number];

export const DEFAULT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export type DocumentRecord = {
  id: string;
  tenantId: string;
  ownerRecordType: DocumentOwnerType;
  ownerRecordId: string;
  filename: string;
  contentType: AllowedDocumentContentType;
  sizeBytes: number;
  storageKey: string;
  uploadedByUserId: string;
  createdAt: Date;
};
