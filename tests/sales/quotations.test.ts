import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import { createProduct } from "@/modules/catalog";
import { createMemoryCatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import { createCustomer } from "@/modules/party";
import { createMemoryPartyRepository } from "@/modules/party/infrastructure/repositories";
import {
  createMemoryHsnSacRepository,
  createMemoryTaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";
import { calculateGst } from "@/modules/tax/domain/calculate-gst";
import {
  createMemoryInventoryRepository,
  quantityFromMajor,
  recordOpeningStock,
} from "@/modules/inventory";
import {
  QuotationNotFoundError,
  QuotationStatusError,
  QuotationValidationError,
  acceptQuotation,
  cancelQuotation,
  createMemorySalesRepository,
  createQuotation,
  getQuotation,
  listQuotations,
  previewQuotation,
  sendQuotation,
  updateQuotation,
  type QuotationInput,
  type QuotationTaxContext,
} from "@/modules/sales";

const maharashtraGstin = "27AABCU9603R1ZM";
const karnatakaGstin = "29AABCU9603R1Z1";

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

function deps() {
  return {
    sales: createMemorySalesRepository(),
    parties: createMemoryPartyRepository(),
    catalog: createMemoryCatalogRepository(),
    taxRates: createMemoryTaxRateRepository(),
    hsnSac: createMemoryHsnSacRepository(),
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  };
}

async function seedCustomer(
  parties: ReturnType<typeof createMemoryPartyRepository>,
  overrides: { gstin?: string | null; state?: string; tenantId?: string } = {}
) {
  return createCustomer({
    tenantId: overrides.tenantId ?? "tenant-a",
    actorUserId: "user-1",
    fields: {
      name: "ABC Traders",
      gstRegistrationStatus: overrides.gstin ? "REGISTERED" : "NOT_REGISTERED",
      gstin: overrides.gstin ?? null,
      state: overrides.state ?? "Maharashtra",
    },
    parties,
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  });
}

async function seedProduct(
  catalog: ReturnType<typeof createMemoryCatalogRepository>,
  tenantId = "tenant-a"
) {
  return createProduct({
    tenantId,
    actorUserId: "user-1",
    fields: {
      kind: "PRODUCT",
      name: "Basmati Rice 25kg",
      sku: "RICE-25",
      unitOfMeasurement: "KG",
      sellingPrice: money(1000_00n),
      purchasePrice: money(800_00n),
      hsnSac: "10063010",
      taxRateBps: 1800,
      category: "Groceries",
      tracksInventory: true,
    },
    catalog,
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  });
}

function quoteFields(
  customerId: string,
  productId: string,
  overrides: Partial<QuotationInput> = {}
): QuotationInput {
  return {
    customerId,
    issuedOn: businessDate("2026-04-02"),
    placeOfSupplyStateCode: "27",
    lines: [
      {
        productId,
        quantity: quantityFromMajor("2"),
        discount: money(100_00n),
      },
    ],
    ...overrides,
  };
}

describe("quotations", () => {
  it("creates a quotation with a line discount and tax-engine GST totals", async () => {
    const repositories = deps();
    const customer = await seedCustomer(repositories.parties, {
      gstin: maharashtraGstin,
    });
    const product = await seedProduct(repositories.catalog);

    const quotation = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: quoteFields(customer.id, product.id),
      taxContext: taxContext(),
      ...repositories,
    });

    const expected = calculateGst({
      businessGstin: maharashtraGstin,
      businessGstRegistrationStatus: "REGISTERED",
      businessStateCode: "27",
      counterpartyGstin: maharashtraGstin,
      placeOfSupplyStateCode: "27",
      transactionType: "SALE",
      hsnSac: "10063010",
      taxableAmount: money(1900_00n),
      taxRateBps: 1800,
    });

    expect(quotation.number).toBe("QT/FY2026-27/0001");
    expect(quotation.status).toBe("DRAFT");
    expect(toMajorString(quotation.subtotal)).toBe("2000.00");
    expect(toMajorString(quotation.discountTotal)).toBe("100.00");
    expect(toMajorString(quotation.taxableAmount)).toBe("1900.00");
    expect(quotation.supplyType).toBe("INTRA_STATE");
    expect(toMajorString(quotation.cgst)).toBe(toMajorString(expected.cgst));
    expect(toMajorString(quotation.sgst)).toBe(toMajorString(expected.sgst));
    expect(toMajorString(quotation.igst)).toBe("0.00");
    expect(toMajorString(quotation.grandTotal)).toBe(toMajorString(expected.grandTotal));
    expect(repositories.audit.records.map((row) => row.action)).toContain(
      "quotation.created"
    );
    expect(repositories.outbox.events.map((row) => row.eventType)).toContain(
      "QuotationCreated"
    );
  });

  it("applies IGST for an inter-state customer without changing stock", async () => {
    const repositories = deps();
    const inventory = createMemoryInventoryRepository();
    const customer = await seedCustomer(repositories.parties, {
      gstin: karnatakaGstin,
      state: "Karnataka",
    });
    const product = await seedProduct(repositories.catalog);

    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("10"),
      occurredOn: businessDate("2026-04-01"),
      catalog: repositories.catalog,
      inventory,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });

    const quotation = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: quoteFields(customer.id, product.id, {
        placeOfSupplyStateCode: "29",
      }),
      taxContext: taxContext(),
      ...repositories,
    });

    expect(quotation.supplyType).toBe("INTER_STATE");
    expect(toMajorString(quotation.igst)).toBe("342.00");
    expect(toMajorString(quotation.cgst)).toBe("0.00");
    expect(inventory.movements).toHaveLength(1);
    expect(inventory.movements[0]?.cause).toBe("OPENING");
  });

  it("rejects cross-tenant quotation access", async () => {
    const repositories = deps();
    const customer = await seedCustomer(repositories.parties);
    const product = await seedProduct(repositories.catalog);
    const quotation = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: quoteFields(customer.id, product.id),
      taxContext: taxContext(),
      ...repositories,
    });

    await expect(
      getQuotation({
        tenantId: "tenant-b",
        quotationId: quotation.id,
        sales: repositories.sales,
      })
    ).rejects.toBeInstanceOf(QuotationNotFoundError);
  });

  it("numbers quotations independently per tenant", async () => {
    const sales = createMemorySalesRepository();
    const parties = createMemoryPartyRepository();
    const catalog = createMemoryCatalogRepository();
    const shared = {
      sales,
      taxRates: createMemoryTaxRateRepository(),
      hsnSac: createMemoryHsnSacRepository(),
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    };

    const customerA = await seedCustomer(parties, { tenantId: "tenant-a" });
    const customerB = await seedCustomer(parties, { tenantId: "tenant-b" });
    const productA = await seedProduct(catalog, "tenant-a");
    const productB = await seedProduct(catalog, "tenant-b");

    const first = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: quoteFields(customerA.id, productA.id),
      taxContext: taxContext(),
      parties,
      catalog,
      ...shared,
    });
    const otherTenant = await createQuotation({
      tenantId: "tenant-b",
      actorUserId: "user-2",
      fields: quoteFields(customerB.id, productB.id),
      taxContext: taxContext(),
      parties,
      catalog,
      ...shared,
    });
    const second = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: quoteFields(customerA.id, productA.id),
      taxContext: taxContext(),
      parties,
      catalog,
      ...shared,
    });

    expect(first.number).toBe("QT/FY2026-27/0001");
    expect(otherTenant.number).toBe("QT/FY2026-27/0001");
    expect(second.number).toBe("QT/FY2026-27/0002");
  });

  it("sends, accepts, and cancels through explicit status transitions", async () => {
    const repositories = deps();
    const customer = await seedCustomer(repositories.parties);
    const product = await seedProduct(repositories.catalog);
    const created = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: quoteFields(customer.id, product.id),
      taxContext: taxContext(),
      ...repositories,
    });

    const sent = await sendQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      quotationId: created.id,
      sales: repositories.sales,
      audit: repositories.audit,
      outbox: repositories.outbox,
    });
    expect(sent.status).toBe("SENT");

    await expect(
      updateQuotation({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        quotationId: created.id,
        fields: quoteFields(customer.id, product.id),
        taxContext: taxContext(),
        ...repositories,
      })
    ).rejects.toBeInstanceOf(QuotationStatusError);

    const accepted = await acceptQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      quotationId: created.id,
      sales: repositories.sales,
      audit: repositories.audit,
      outbox: repositories.outbox,
    });
    expect(accepted.status).toBe("ACCEPTED");

    const cancelled = await cancelQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      quotationId: created.id,
      sales: repositories.sales,
      audit: repositories.audit,
      outbox: repositories.outbox,
    });
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects a zero quantity and an oversized discount", async () => {
    const repositories = deps();
    const customer = await seedCustomer(repositories.parties);
    const product = await seedProduct(repositories.catalog);

    await expect(
      previewQuotation({
        tenantId: "tenant-a",
        fields: quoteFields(customer.id, product.id, {
          lines: [{ productId: product.id, quantity: quantityFromMajor("0") }],
        }),
        taxContext: taxContext(),
        parties: repositories.parties,
        catalog: repositories.catalog,
        taxRates: repositories.taxRates,
        hsnSac: repositories.hsnSac,
      })
    ).rejects.toBeInstanceOf(QuotationValidationError);

    await expect(
      createQuotation({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: quoteFields(customer.id, product.id, {
          lines: [
            {
              productId: product.id,
              quantity: quantityFromMajor("1"),
              discount: money(2000_00n),
            },
          ],
        }),
        taxContext: taxContext(),
        ...repositories,
      })
    ).rejects.toBeInstanceOf(QuotationValidationError);
  });

  it("lists quotations for the current tenant only", async () => {
    const repositories = deps();
    const customer = await seedCustomer(repositories.parties);
    const product = await seedProduct(repositories.catalog);
    await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: quoteFields(customer.id, product.id),
      taxContext: taxContext(),
      ...repositories,
    });

    const listed = await listQuotations({
      tenantId: "tenant-a",
      sales: repositories.sales,
    });
    const other = await listQuotations({
      tenantId: "tenant-b",
      sales: repositories.sales,
    });

    expect(listed).toHaveLength(1);
    expect(other).toHaveLength(0);
  });
});
