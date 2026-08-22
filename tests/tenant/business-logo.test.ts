import { describe, expect, it } from "vitest";

import { createMemoryStorageAdapter } from "@/lib/storage/memory-adapter";
import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { DocumentValidationError } from "@/modules/documents";
import { createMemoryDocumentRepository } from "@/modules/documents/infrastructure/repositories";
import {
  clearBusinessLogo,
  setBusinessLogo,
} from "@/modules/tenant/application/business-logo";
import { createMemoryBusinessRepository } from "@/modules/tenant/infrastructure/repositories";

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

describe("business logo", () => {
  it("stores an image as the workspace logo and replaces the previous file", async () => {
    const business = createMemoryBusinessRepository();
    const created = await business.create({
      clerkOrganizationId: "org_logo",
      ownerUserId: "user-1",
      name: "Sharma Traders",
      type: "PROPRIETORSHIP",
      addressLine1: "1 Market Road",
      city: "Pune",
      state: "Maharashtra",
      postalCode: "411001",
      country: "IN",
      phone: "9876543210",
      email: "sharma@example.com",
      gstRegistrationStatus: "REGISTERED",
      gstin: "27AABCU9603R1ZM",
      financialYearStartMonth: 4,
      timezone: "Asia/Kolkata",
      currency: "INR",
      defaultGstRateBps: 1800,
      lowStockThreshold: "5",
    });
    const documents = createMemoryDocumentRepository();
    const storage = createMemoryStorageAdapter({ maxBytes: 1024 * 1024 });
    const audit = createMemoryAuditRepository();

    const first = await setBusinessLogo({
      tenantId: created.id,
      actorUserId: "user-1",
      filename: "logo.png",
      bytes: PNG_BYTES,
      business,
      documents,
      storage,
      audit,
    });
    expect(first.logoDocumentId).toBeTruthy();

    const second = await setBusinessLogo({
      tenantId: created.id,
      actorUserId: "user-1",
      filename: "logo-2.png",
      bytes: PNG_BYTES,
      business,
      documents,
      storage,
      audit,
    });
    expect(second.logoDocumentId).not.toBe(first.logoDocumentId);
    await expect(
      documents.findById(created.id, first.logoDocumentId!)
    ).resolves.toBeNull();

    const cleared = await clearBusinessLogo({
      tenantId: created.id,
      actorUserId: "user-1",
      business,
      documents,
      storage,
      audit,
    });
    expect(cleared.logoDocumentId).toBeNull();
  });

  it("rejects a PDF uploaded as a logo", async () => {
    const business = createMemoryBusinessRepository();
    const created = await business.create({
      clerkOrganizationId: "org_logo_pdf",
      ownerUserId: "user-1",
      name: "Sharma Traders",
      type: "PROPRIETORSHIP",
      addressLine1: "1 Market Road",
      city: "Pune",
      state: "Maharashtra",
      postalCode: "411001",
      country: "IN",
      phone: "9876543210",
      email: "sharma@example.com",
      gstRegistrationStatus: "REGISTERED",
      gstin: "27AABCU9603R1ZM",
      financialYearStartMonth: 4,
      timezone: "Asia/Kolkata",
      currency: "INR",
      defaultGstRateBps: 1800,
      lowStockThreshold: "5",
    });

    await expect(
      setBusinessLogo({
        tenantId: created.id,
        actorUserId: "user-1",
        filename: "logo.pdf",
        bytes: PDF_BYTES,
        business,
        documents: createMemoryDocumentRepository(),
        storage: createMemoryStorageAdapter({ maxBytes: 1024 * 1024 }),
        audit: createMemoryAuditRepository(),
      })
    ).rejects.toBeInstanceOf(DocumentValidationError);
  });
});
