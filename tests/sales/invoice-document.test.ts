import { describe, expect, it } from "vitest";
import sharp from "sharp";

import { createMemoryStorageAdapter } from "@/lib/storage/memory-adapter";
import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import {
  createMemoryAccountRepository,
  createMemoryJournalRepository,
  ensureChartOfAccounts,
} from "@/modules/accounting";
import { createProduct } from "@/modules/catalog";
import { createMemoryCatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import { createCustomer } from "@/modules/party";
import { createMemoryPartyRepository } from "@/modules/party/infrastructure/repositories";
import { createMemoryDocumentRepository } from "@/modules/documents/infrastructure/repositories";
import {
  createMemoryHsnSacRepository,
  createMemoryTaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";
import { createMemoryInventoryRepository } from "@/modules/inventory";
import { quantityFromMajor } from "@/modules/inventory";
import {
  buildInvoiceDocumentView,
  createInvoice,
  createMemorySalesRepository,
  exportInvoicePdf,
  InvoiceValidationError,
  postInvoice,
  previewInvoice,
  type SalesTaxContext,
} from "@/modules/sales";
import { renderInvoicePdfBytes } from "@/modules/sales/application/invoice-pdf";
import type { BusinessProfile } from "@/modules/tenant/domain/types";

const maharashtraGstin = "27AABCU9603R1ZM";

function taxContext(): SalesTaxContext {
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

function pdfContainsImage(bytes: Uint8Array): boolean {
  const raw = new TextDecoder("latin1").decode(bytes);
  return raw.includes("/Subtype /Image") || raw.includes("/Subtype/Image");
}

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

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

describe("invoice document and PDF", () => {
  it("builds a GST tax invoice view from tax-engine totals", async () => {
    const parties = createMemoryPartyRepository();
    const catalog = createMemoryCatalogRepository();
    const sales = createMemorySalesRepository();
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
    const prepared = await previewInvoice({
      tenantId: "tenant-a",
      fields: {
        customerId: customer.id,
        issuedOn: businessDate("2026-04-02"),
        dueOn: businessDate("2026-04-16"),
        placeOfSupplyStateCode: "29",
        lines: [{ productId: product.id, quantity: quantityFromMajor("2") }],
      },
      taxContext: taxContext(),
      parties,
      catalog,
      taxRates: createMemoryTaxRateRepository(),
      hsnSac: createMemoryHsnSacRepository(),
    });
    const view = buildInvoiceDocumentView({
      number: "INV/FY2026-27/0001",
      issuedOn: prepared.issuedOn,
      dueOn: prepared.dueOn,
      notes: "Pay by NEFT",
      placeOfSupplyStateCode: prepared.placeOfSupplyStateCode,
      seller: seller(),
      buyer: customer,
      logoUrl: null,
      prepared,
    });

    expect(view.title).toBe("TAX INVOICE");
    expect(view.seller.gstin).toBe(maharashtraGstin);
    expect(view.buyer.name).toBe("Adarsh Pandey");
    expect(view.lines[0]?.hsnSac).toBe("851220");
    expect(view.supplyTypeLabel).toMatch(/IGST/);
    expect(view.totals?.igst).toContain("INR");
    expect(view.totals?.amountInWords).toMatch(/^INR /);

    const bytes = await renderInvoicePdfBytes(view);
    const text = pdfDecodedText(bytes);
    expect(text).toContain("TAX INVOICE");
    expect(text).toContain("Adarsh Pandey");
    expect(text).toContain(maharashtraGstin);
    expect(text).toContain("851220");
    expect(text).toContain("IGST");
    expect(text).toContain("BILLED TO");
    expect(pdfContainsImage(bytes)).toBe(false);

    const pngPdf = await renderInvoicePdfBytes(view, {
      bytes: PNG_BYTES,
      contentType: "image/png",
    });
    expect(pdfContainsImage(pngPdf)).toBe(true);

    const webp = await sharp(PNG_BYTES).webp().toBuffer();
    const webpPdf = await renderInvoicePdfBytes(view, {
      bytes: webp,
      contentType: "image/webp",
    });
    expect(pdfContainsImage(webpPdf)).toBe(true);
  });

  it("rejects PDF export for draft invoices", async () => {
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
    const invoice = await createInvoice({
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
      exportInvoicePdf({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        business: seller(),
        invoiceId: invoice.id,
        sales,
        parties,
        documents: createMemoryDocumentRepository(),
        storage: createMemoryStorageAdapter({ maxBytes: 1024 * 1024 }),
        audit,
      })
    ).rejects.toBeInstanceOf(InvoiceValidationError);
  });

  it("stores a GST tax invoice PDF for a posted invoice", async () => {
    const parties = createMemoryPartyRepository();
    const catalog = createMemoryCatalogRepository();
    const sales = createMemorySalesRepository();
    const audit = createMemoryAuditRepository();
    const outbox = createMemoryOutboxRepository();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId: "tenant-a", accountRepository: accounts });
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
    const taxRates = createMemoryTaxRateRepository();
    const hsnSac = createMemoryHsnSacRepository();
    const draft = await createInvoice({
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
      taxRates,
      hsnSac,
      audit,
      outbox,
    });
    const posted = await postInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      invoiceId: draft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      sales,
      parties,
      catalog,
      taxRates,
      hsnSac,
      audit,
      outbox,
      accounts,
      journals,
      inventory,
    });
    const documents = createMemoryDocumentRepository();
    const storage = createMemoryStorageAdapter({ maxBytes: 1024 * 1024 });
    const uploaded = await exportInvoicePdf({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      business: seller(),
      invoiceId: posted.id,
      sales,
      parties,
      documents,
      storage,
      audit,
    });
    expect(uploaded.ownerRecordType).toBe("INVOICE");
    expect(uploaded.contentType).toBe("application/pdf");
    const stored = await storage.download(uploaded.storageKey);
    const text = pdfDecodedText(stored.body);
    expect(text).toContain("TAX INVOICE");
    expect(text).toContain("ABC Traders");
    expect(text).toContain("10063010");
    expect(text).toContain("CGST");
  });
});
