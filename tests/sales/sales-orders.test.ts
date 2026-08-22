import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import {
  createMemoryAccountRepository,
  createMemoryJournalRepository,
  ensureChartOfAccounts,
} from "@/modules/accounting";
import { createProduct } from "@/modules/catalog";
import { createMemoryCatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import { createCustomer } from "@/modules/party";
import { createMemoryPartyRepository } from "@/modules/party/infrastructure/repositories";
import {
  createMemoryHsnSacRepository,
  createMemoryTaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";
import {
  createMemoryInventoryRepository,
  quantityFromMajor,
  recordOpeningStock,
} from "@/modules/inventory";
import {
  QuotationAlreadyConvertedError,
  SalesOrderAlreadyConvertedError,
  acceptQuotation,
  confirmSalesOrder,
  convertQuotationToSalesOrder,
  convertSalesOrderToInvoice,
  createMemorySalesRepository,
  createQuotation,
  createSalesOrder,
  postInvoice,
  sendQuotation,
  type QuotationInput,
  type SalesOrderInput,
  type SalesTaxContext,
} from "@/modules/sales";

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
  tenantId = "tenant-a"
) {
  return createCustomer({
    tenantId,
    actorUserId: "user-1",
    fields: {
      name: "ABC Traders",
      gstRegistrationStatus: "REGISTERED",
      gstin: maharashtraGstin,
      state: "Maharashtra",
    },
    parties,
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  });
}

async function seedProduct(
  catalog: ReturnType<typeof createMemoryCatalogRepository>,
  tenantId = "tenant-a",
  tracksInventory = false
) {
  return createProduct({
    tenantId,
    actorUserId: "user-1",
    fields: {
      kind: "PRODUCT",
      name: "Basmati Rice 25kg",
      sku: tracksInventory ? "RICE-INV" : "RICE-SVC",
      unitOfMeasurement: "KG",
      sellingPrice: money(1000_00n),
      purchasePrice: money(800_00n),
      hsnSac: "10063010",
      taxRateBps: 1800,
      tracksInventory,
    },
    catalog,
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  });
}

function orderFields(customerId: string, productId: string): SalesOrderInput {
  return {
    customerId,
    issuedOn: businessDate("2026-04-02"),
    expectedOn: businessDate("2026-04-16"),
    placeOfSupplyStateCode: "27",
    lines: [{ productId, quantity: quantityFromMajor("2"), discount: money(0n) }],
  };
}

function quotationFields(customerId: string, productId: string): QuotationInput {
  return {
    customerId,
    issuedOn: businessDate("2026-04-02"),
    validUntil: businessDate("2026-04-30"),
    placeOfSupplyStateCode: "27",
    lines: [{ productId, quantity: quantityFromMajor("2"), discount: money(0n) }],
  };
}

describe("sales orders", () => {
  it("creates a draft sales order and confirms without moving stock", async () => {
    const d = deps();
    const inventory = createMemoryInventoryRepository();
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog, "tenant-a", true);
    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("10"),
      occurredOn: businessDate("2026-04-01"),
      catalog: d.catalog,
      inventory,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });

    const draft = await createSalesOrder({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: orderFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    expect(draft.status).toBe("DRAFT");
    expect(draft.number).toMatch(/^SO\/FY2026-27\/\d{4}$/);
    expect(toMajorString(draft.grandTotal)).toBe("2360.00");

    const confirmed = await confirmSalesOrder({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      salesOrderId: draft.id,
      sales: d.sales,
      audit: d.audit,
      outbox: d.outbox,
    });
    expect(confirmed.status).toBe("CONFIRMED");
    const movements = await inventory.listMovements("tenant-a", product.id);
    expect(movements.some((m) => m.cause === "SALE")).toBe(false);
    expect(d.outbox.events.some((e) => e.eventType === "SalesOrderConfirmed")).toBe(true);
  });

  it("converts quotation → order → invoice and rejects double convert", async () => {
    const d = deps();
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);

    const quotation = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: quotationFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    await sendQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      quotationId: quotation.id,
      sales: d.sales,
      audit: d.audit,
      outbox: d.outbox,
    });
    await acceptQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      quotationId: quotation.id,
      sales: d.sales,
      audit: d.audit,
      outbox: d.outbox,
    });

    const order = await convertQuotationToSalesOrder({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      quotationId: quotation.id,
      taxContext: taxContext(),
      ...d,
    });
    expect(order.status).toBe("CONFIRMED");
    expect(order.quotationId).toBe(quotation.id);
    expect(
      (await d.sales.findQuotationById("tenant-a", quotation.id))?.status
    ).toBe("CONVERTED");

    await expect(
      convertQuotationToSalesOrder({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        quotationId: quotation.id,
        taxContext: taxContext(),
        ...d,
      })
    ).rejects.toBeInstanceOf(QuotationAlreadyConvertedError);

    const invoice = await convertSalesOrderToInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      salesOrderId: order.id,
      taxContext: taxContext(),
      ...d,
    });
    expect(invoice.status).toBe("DRAFT");
    expect(invoice.salesOrderId).toBe(order.id);
    expect(
      (await d.sales.findSalesOrderById("tenant-a", order.id))?.status
    ).toBe("FULFILLED");

    await expect(
      convertSalesOrderToInvoice({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        salesOrderId: order.id,
        taxContext: taxContext(),
        ...d,
      })
    ).rejects.toBeInstanceOf(SalesOrderAlreadyConvertedError);
  });

  it("posts stock only when the converted invoice is posted", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId: "tenant-a", accountRepository: accounts });
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog, "tenant-a", true);
    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("10"),
      occurredOn: businessDate("2026-04-01"),
      catalog: d.catalog,
      inventory,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });

    const draft = await createSalesOrder({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: orderFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    const confirmed = await confirmSalesOrder({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      salesOrderId: draft.id,
      sales: d.sales,
      audit: d.audit,
      outbox: d.outbox,
    });
    const invoice = await convertSalesOrderToInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      salesOrderId: confirmed.id,
      taxContext: taxContext(),
      ...d,
    });

    expect(
      (await inventory.listMovements("tenant-a", product.id)).some(
        (m) => m.cause === "SALE"
      )
    ).toBe(false);

    const posted = await postInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      invoiceId: invoice.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    expect(posted.status).toBe("POSTED");
    expect(
      (await inventory.listMovements("tenant-a", product.id)).some(
        (m) => m.cause === "SALE" && m.direction === "OUT"
      )
    ).toBe(true);
  });
});
