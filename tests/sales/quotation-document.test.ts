import { describe, expect, it } from "vitest";

import { createMemoryStorageAdapter } from "@/lib/storage/memory-adapter";
import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import { createProduct } from "@/modules/catalog";
import { createMemoryCatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import { createCustomer } from "@/modules/party";
import { createMemoryPartyRepository } from "@/modules/party/infrastructure/repositories";
import { createMemoryDocumentRepository } from "@/modules/documents/infrastructure/repositories";
import {
  createMemoryHsnSacRepository,
  createMemoryTaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";
import { quantityFromMajor } from "@/modules/inventory";
import {
  buildQuotationDocumentView,
  createMemorySalesRepository,
  createQuotation,
  exportQuotationPdf,
  previewQuotation,
  QuotationValidationError,
  sendQuotation,
  type QuotationTaxContext,
} from "@/modules/sales";
import { renderQuotationPdfBytes } from "@/modules/sales/application/quotation-pdf";
import type { BusinessProfile } from "@/modules/tenant/domain/types";

const maharashtraGstin = "27AABCU9603R1ZM";

function taxContext(): QuotationTaxContext {
  return {
    gstin: maharashtraGstin,
    gstRegistrationStatus: "REGISTERED",
    stateName: "Maharashtra",
    defaultGstRateBps: 1800,
    financialYearStartMonth: 4,
    currency: "INR",
  };
}

function seller(): BusinessProfile {
  return {
    id: "tenant-a",
    clerkOrganizationId: "org_a",
    name: "Sharma Traders",
    type: "PROPRIETORSHIP",
    ownerUserId: "user-1",
    addressLine1: "12 MG Road",
    addressLine2: null,
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411001",
    country: "IN",
    phone: "9876543210",
    email: "sharma@example.com",
    gstRegistrationStatus: "REGISTERED",
    gstin: maharashtraGstin,
    financialYearStartMonth: 4,
    timezone: "Asia/Kolkata",
    currency: "INR",
    defaultGstRateBps: 1800,
    lowStockThreshold: "5",
    logoDocumentId: null,
    closedThroughPeriodKey: null,
  };
}

function pdfDecodedText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  const hexLiteral = /<([0-9A-Fa-f]+)>/g;
  for (const match of raw.matchAll(hexLiteral)) {
    const hex = match[1] ?? "";
    let decoded = "";
    for (let index = 0; index < hex.length; index += 2) {
      decoded += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
    }
    chunks.push(decoded);
  }
  return `${raw}\n${chunks.join("")}`;
}

describe("quotation document and PDF", () => {
  it("builds a GST quotation view from tax-engine totals", async () => {
    const parties = createMemoryPartyRepository();
    const catalog = createMemoryCatalogRepository();
    const customer = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        name: "Adarsh Pandey",
        gstRegistrationStatus: "NOT_REGISTERED",
        billingAddressLine1: "88 Residency Road",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
      },
      parties,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });
    const product = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        kind: "PRODUCT",
        name: "Avengers Headlight",
        sku: "HL-1",
        unitOfMeasurement: "PCS",
        sellingPrice: money(1000_00n),
        purchasePrice: money(800_00n),
        hsnSac: "851220",
        taxRateBps: 1800,
        tracksInventory: false,
      },
      catalog,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });
    const prepared = await previewQuotation({
      tenantId: "tenant-a",
      fields: {
        customerId: customer.id,
        issuedOn: businessDate("2026-04-02"),
        validUntil: businessDate("2026-04-16"),
        placeOfSupplyStateCode: "29",
        lines: [{ productId: product.id, quantity: quantityFromMajor("2") }],
      },
      taxContext: taxContext(),
      parties,
      catalog,
      taxRates: createMemoryTaxRateRepository(),
      hsnSac: createMemoryHsnSacRepository(),
    });
    const view = buildQuotationDocumentView({
      number: "QT/FY2026-27/0001",
      issuedOn: prepared.issuedOn,
      validUntil: prepared.validUntil,
      notes: "Valid for 14 days",
      placeOfSupplyStateCode: prepared.placeOfSupplyStateCode,
      seller: seller(),
      buyer: customer,
      logoUrl: null,
      prepared,
    });

    expect(view.title).toBe("QUOTATION");
    expect(view.validUntil).toBe(businessDate("2026-04-16"));
    expect(view.seller.gstin).toBe(maharashtraGstin);
    expect(view.buyer.name).toBe("Adarsh Pandey");
    expect(view.lines[0]?.hsnSac).toBe("851220");
    expect(view.supplyTypeLabel).toMatch(/IGST/);
    expect(view.totals?.igst).toContain("INR");
    expect(view.totals?.amountInWords).toMatch(/^INR /);

    const bytes = await renderQuotationPdfBytes(view);
    const text = pdfDecodedText(bytes);
    expect(text).toContain("QUOTATION");
    expect(text).toContain("QT/FY2026-27/0001");
    expect(text).toContain("Adarsh Pandey");
    expect(text).toContain(maharashtraGstin);
    expect(text).toContain("851220");
    expect(text).toContain("IGST");
    expect(text).toContain("QUOTED TO");
  });

  it("rejects PDF export for draft quotations", async () => {
    const parties = createMemoryPartyRepository();
    const catalog = createMemoryCatalogRepository();
    const sales = createMemorySalesRepository();
    const audit = createMemoryAuditRepository();
    const outbox = createMemoryOutboxRepository();
    const customer = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        name: "ABC Traders",
        gstRegistrationStatus: "REGISTERED",
        gstin: maharashtraGstin,
        state: "Maharashtra",
      },
      parties,
      audit,
      outbox,
    });
    const product = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        kind: "PRODUCT",
        name: "Basmati Rice 25kg",
        sku: "RICE",
        unitOfMeasurement: "KG",
        sellingPrice: money(1000_00n),
        purchasePrice: money(800_00n),
        hsnSac: "10063010",
        taxRateBps: 1800,
        tracksInventory: false,
      },
      catalog,
      audit,
      outbox,
    });
    const quotation = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        customerId: customer.id,
        issuedOn: businessDate("2026-04-02"),
        lines: [{ productId: product.id, quantity: quantityFromMajor("1") }],
      },
      taxContext: taxContext(),
      sales,
      parties,
      catalog,
      taxRates: createMemoryTaxRateRepository(),
      hsnSac: createMemoryHsnSacRepository(),
      audit,
      outbox,
    });

    await expect(
      exportQuotationPdf({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        business: seller(),
        quotationId: quotation.id,
        sales,
        parties,
        documents: createMemoryDocumentRepository(),
        storage: createMemoryStorageAdapter({ maxBytes: 1024 * 1024 }),
        audit,
      })
    ).rejects.toBeInstanceOf(QuotationValidationError);
  });

  it("stores a GST quotation PDF for a sent quotation", async () => {
    const parties = createMemoryPartyRepository();
    const catalog = createMemoryCatalogRepository();
    const sales = createMemorySalesRepository();
    const audit = createMemoryAuditRepository();
    const outbox = createMemoryOutboxRepository();
    const customer = await createCustomer({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        name: "ABC Traders",
        gstRegistrationStatus: "REGISTERED",
        gstin: maharashtraGstin,
        state: "Maharashtra",
      },
      parties,
      audit,
      outbox,
    });
    const product = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        kind: "PRODUCT",
        name: "Basmati Rice 25kg",
        sku: "RICE",
        unitOfMeasurement: "KG",
        sellingPrice: money(1000_00n),
        purchasePrice: money(800_00n),
        hsnSac: "10063010",
        taxRateBps: 1800,
        tracksInventory: false,
      },
      catalog,
      audit,
      outbox,
    });
    const draft = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        customerId: customer.id,
        issuedOn: businessDate("2026-04-02"),
        lines: [{ productId: product.id, quantity: quantityFromMajor("1") }],
      },
      taxContext: taxContext(),
      sales,
      parties,
      catalog,
      taxRates: createMemoryTaxRateRepository(),
      hsnSac: createMemoryHsnSacRepository(),
      audit,
      outbox,
    });
    const sent = await sendQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      quotationId: draft.id,
      sales,
      audit,
      outbox,
    });
    const documents = createMemoryDocumentRepository();
    const storage = createMemoryStorageAdapter({ maxBytes: 1024 * 1024 });
    const uploaded = await exportQuotationPdf({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      business: seller(),
      quotationId: sent.id,
      sales,
      parties,
      documents,
      storage,
      audit,
    });
    expect(uploaded.ownerRecordType).toBe("QUOTATION");
    expect(uploaded.contentType).toBe("application/pdf");
    const stored = await storage.download(uploaded.storageKey);
    const text = pdfDecodedText(stored.body);
    expect(text).toContain("QUOTATION");
    expect(text).toContain("ABC Traders");
    expect(text).toContain("10063010");
    expect(text).toContain("CGST");
  });
});
