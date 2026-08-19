import { describe, expect, it } from "vitest";

import { createMemoryStorageAdapter } from "@/lib/storage/memory-adapter";
import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import {
  DocumentNotFoundError,
  DocumentTooLargeError,
  UnsupportedDocumentTypeError,
  downloadDocument,
  uploadDocument,
} from "@/modules/documents";
import { createMemoryDocumentRepository } from "@/modules/documents/infrastructure/repositories";
import { inspectUploadBytes } from "@/modules/documents/domain/inspect-upload";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

function deps() {
  return {
    storage: createMemoryStorageAdapter({ maxBytes: 1024 * 1024 }),
    documents: createMemoryDocumentRepository(),
    audit: createMemoryAuditRepository(),
  };
}

describe("inspectUploadBytes", () => {
  it("accepts a PDF whose extension matches sniffed bytes", () => {
    const inspected = inspectUploadBytes({
      filename: "receipt.pdf",
      bytes: PDF_BYTES,
    });
    expect(inspected.contentType).toBe("application/pdf");
    expect(inspected.filename).toBe("receipt.pdf");
  });

  it("ignores client-supplied paths and keeps the basename", () => {
    const inspected = inspectUploadBytes({
      filename: "../../etc/passwd.pdf",
      bytes: PDF_BYTES,
    });
    expect(inspected.filename).toBe("passwd.pdf");
  });

  it("rejects disallowed types even when named like a PDF", () => {
    expect(() =>
      inspectUploadBytes({
        filename: "payload.pdf",
        bytes: new TextEncoder().encode("<script>alert(1)</script>"),
      })
    ).toThrow(UnsupportedDocumentTypeError);
  });

  it("rejects a PDF magic with an executable extension", () => {
    expect(() =>
      inspectUploadBytes({
        filename: "payload.exe",
        bytes: PDF_BYTES,
      })
    ).toThrow(UnsupportedDocumentTypeError);
  });

  it("rejects oversized files", () => {
    const bytes = new Uint8Array(32);
    bytes.set(PDF_BYTES.slice(0, 8));
    expect(() =>
      inspectUploadBytes({
        filename: "huge.pdf",
        bytes,
        maxBytes: 16,
      })
    ).toThrow(DocumentTooLargeError);
  });
});

describe("uploadDocument / downloadDocument", () => {
  it("lets a tenant upload a file and download the same bytes", async () => {
    const { storage, documents, audit } = deps();
    const uploaded = await uploadDocument({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      ownerRecordType: "BUSINESS",
      ownerRecordId: "tenant-a",
      filename: "receipt.pdf",
      bytes: PDF_BYTES,
      storage,
      documents,
      audit,
    });

    const downloaded = await downloadDocument({
      tenantId: "tenant-a",
      documentId: uploaded.id,
      documents,
      storage,
    });

    expect(downloaded.record.filename).toBe("receipt.pdf");
    expect(downloaded.record.contentType).toBe("application/pdf");
    expect(Array.from(downloaded.body)).toEqual(Array.from(PDF_BYTES));
    expect(audit.records).toHaveLength(1);
    expect(audit.records[0]?.action).toBe("document.uploaded");
  });

  it("stores PNG metadata from sniffed bytes, not a claimed type", async () => {
    const { storage, documents, audit } = deps();
    const uploaded = await uploadDocument({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      ownerRecordType: "BUSINESS",
      ownerRecordId: "tenant-a",
      filename: "scan.png",
      bytes: PNG_BYTES,
      storage,
      documents,
      audit,
    });

    expect(uploaded.contentType).toBe("image/png");
  });

  it("does not let another tenant read a document by id", async () => {
    const { storage, documents, audit } = deps();
    const uploaded = await uploadDocument({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      ownerRecordType: "BUSINESS",
      ownerRecordId: "tenant-a",
      filename: "receipt.pdf",
      bytes: PDF_BYTES,
      storage,
      documents,
      audit,
    });

    await expect(
      downloadDocument({
        tenantId: "tenant-b",
        documentId: uploaded.id,
        documents,
        storage,
      })
    ).rejects.toBeInstanceOf(DocumentNotFoundError);
  });
});
