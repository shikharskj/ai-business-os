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
  InvoiceAlreadyPostedError,
  InvoiceNotFoundError,
  InvoiceStatusError,
  QuotationAlreadyConvertedError,
  sendQuotation,
  acceptQuotation,
  convertQuotationToInvoice,
  createInvoice,
  createMemorySalesRepository,
  createQuotation,
  getInvoice,
  postInvoice,
  type InvoiceInput,
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

function invoiceFields(customerId: string, productId: string): InvoiceInput {
  return {
    customerId,
    issuedOn: businessDate("2026-04-02"),
    dueOn: businessDate("2026-04-16"),
    placeOfSupplyStateCode: "27",
    lines: [{ productId, quantity: quantityFromMajor("2"), discount: money(0n) }],
  };
}

describe("sales invoices", () => {
  it("creates a draft invoice with GST from the tax engine", async () => {
    const d = deps();
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);
    const invoice = await createInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: invoiceFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    expect(invoice.status).toBe("DRAFT");
    expect(invoice.number).toMatch(/^INV\/FY2026-27\/\d{4}$/);
    expect(toMajorString(invoice.grandTotal)).toBe("2360.00");
    expect(d.outbox.events.at(-1)?.eventType).toBe("SalesInvoiceCreated");
  });

  it("posts an invoice with balanced journal and inventory movement", async () => {
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
    const draft = await createInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: invoiceFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    const posted = await postInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      invoiceId: draft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    expect(posted.status).toBe("POSTED");
    expect(posted.journalId).toBeTruthy();
    const journal = journals.listPosted()[0]!;
    const debits = journal.lines.reduce((sum, line) => sum + line.debit.amountMinor, 0n);
    const credits = journal.lines.reduce((sum, line) => sum + line.credit.amountMinor, 0n);
    expect(debits).toBe(credits);
    const movements = await inventory.listMovements("tenant-a", product.id);
    expect(movements.some((m) => m.cause === "SALE" && m.direction === "OUT")).toBe(true);
    expect(d.outbox.events.some((e) => e.eventType === "SalesInvoicePosted")).toBe(true);
  });

  it("rejects posting twice", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId: "tenant-a", accountRepository: accounts });
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);
    const draft = await createInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: invoiceFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    await postInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      invoiceId: draft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    await expect(
      postInvoice({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        invoiceId: draft.id,
        taxContext: taxContext(),
        closedThroughPeriodKey: null,
        accounts,
        journals,
        inventory,
        ...d,
      })
    ).rejects.toBeInstanceOf(InvoiceAlreadyPostedError);
  });

  it("rejects cross-tenant invoice access", async () => {
    const d = deps();
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);
    const invoice = await createInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: invoiceFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    await expect(
      getInvoice({ tenantId: "tenant-b", invoiceId: invoice.id, sales: d.sales })
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
  });

  it("converts an accepted quotation once", async () => {
    const d = deps();
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);
    const quotation = await createQuotation({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        customerId: customer.id,
        issuedOn: businessDate("2026-04-02"),
        placeOfSupplyStateCode: "27",
        lines: [{ productId: product.id, quantity: quantityFromMajor("1") }],
      },
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
    const invoice = await convertQuotationToInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      quotationId: quotation.id,
      taxContext: taxContext(),
      ...d,
    });
    expect(invoice.quotationId).toBe(quotation.id);
    expect(invoice.status).toBe("DRAFT");
    await expect(
      convertQuotationToInvoice({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        quotationId: quotation.id,
        taxContext: taxContext(),
        ...d,
      })
    ).rejects.toBeInstanceOf(QuotationAlreadyConvertedError);
  });

  it("cannot cancel a posted invoice", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId: "tenant-a", accountRepository: accounts });
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);
    const draft = await createInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: invoiceFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    const posted = await postInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      invoiceId: draft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    expect(posted.status).toBe("POSTED");
    const { cancelInvoice } = await import("@/modules/sales/application/invoices");
    await expect(
      cancelInvoice({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        invoiceId: posted.id,
        sales: d.sales,
        audit: d.audit,
        outbox: d.outbox,
      })
    ).rejects.toBeInstanceOf(InvoiceStatusError);
  });
});
