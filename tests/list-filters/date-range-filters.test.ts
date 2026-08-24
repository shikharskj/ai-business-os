import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import type { PageSize } from "@/modules/shared-kernel/list-page";
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
} from "@/modules/inventory";
import {
  createInvoice,
  createMemorySalesRepository,
  createQuotation,
  decorateInvoiceListRows,
  listInvoicesPage,
  listQuotationsPage,
  postInvoice,
  type InvoiceInput,
  type QuotationInput,
  type SalesTaxContext,
} from "@/modules/sales";
import {
  recordCustomerPayment,
  createMemoryPaymentRepository,
  listPaymentsPage,
} from "@/modules/payments";
import { listProductsPage } from "@/modules/catalog";

const maharashtraGstin = "27AABCU9603R1ZM";
const tenantId = "tenant-a";
const actorUserId = "user-1";

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

async function seedCustomer(parties: ReturnType<typeof createMemoryPartyRepository>) {
  return createCustomer({
    tenantId,
    actorUserId,
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

async function seedProduct(catalog: ReturnType<typeof createMemoryCatalogRepository>) {
  return createProduct({
    tenantId,
    actorUserId,
    fields: {
      kind: "PRODUCT",
      name: "Widget",
      sku: "WGT-001",
      unitOfMeasurement: "PCS",
      sellingPrice: money(500_00n),
      purchasePrice: money(300_00n),
      hsnSac: "84716020",
      taxRateBps: 1800,
      tracksInventory: false,
    },
    catalog,
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  });
}

function baseDeps() {
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

const pageSize = 50 as PageSize;

describe("invoice date range filters", () => {
  it("returns only invoices within the from–to range and reflects in total", async () => {
    const d = baseDeps();
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);

    const fields = (date: string): InvoiceInput => ({
      customerId: customer.id,
      issuedOn: businessDate(date),
      dueOn: null,
      placeOfSupplyStateCode: "27",
      lines: [{ productId: product.id, quantity: quantityFromMajor("1"), discount: money(0n) }],
    });

    await createInvoice({ tenantId, actorUserId, fields: fields("2026-04-01"), taxContext: taxContext(), ...d });
    await createInvoice({ tenantId, actorUserId, fields: fields("2026-04-15"), taxContext: taxContext(), ...d });
    await createInvoice({ tenantId, actorUserId, fields: fields("2026-05-01"), taxContext: taxContext(), ...d });

    const filtered = await listInvoicesPage({
      tenantId,
      fromDate: businessDate("2026-04-01"),
      toDate: businessDate("2026-04-15"),
      page: 1,
      pageSize,
      sales: d.sales,
    });
    expect(filtered.total).toBe(2);
    expect(filtered.items).toHaveLength(2);

    const all = await listInvoicesPage({ tenantId, page: 1, pageSize, sales: d.sales });
    expect(all.total).toBe(3);
  });
});

describe("quotation date range filters", () => {
  it("returns only quotations within the from–to range", async () => {
    const d = baseDeps();
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);

    const fields = (date: string): QuotationInput => ({
      customerId: customer.id,
      issuedOn: businessDate(date),
      validUntil: null,
      placeOfSupplyStateCode: "27",
      lines: [{ productId: product.id, quantity: quantityFromMajor("1"), discount: money(0n) }],
    });

    await createQuotation({ tenantId, actorUserId, fields: fields("2026-04-05"), taxContext: taxContext(), ...d });
    await createQuotation({ tenantId, actorUserId, fields: fields("2026-04-20"), taxContext: taxContext(), ...d });
    await createQuotation({ tenantId, actorUserId, fields: fields("2026-05-10"), taxContext: taxContext(), ...d });

    const filtered = await listQuotationsPage({
      tenantId,
      fromDate: businessDate("2026-04-01"),
      toDate: businessDate("2026-04-20"),
      page: 1,
      pageSize,
      sales: d.sales,
    });
    expect(filtered.total).toBe(2);

    const fromOnly = await listQuotationsPage({
      tenantId,
      fromDate: businessDate("2026-05-01"),
      page: 1,
      pageSize,
      sales: d.sales,
    });
    expect(fromOnly.total).toBe(1);
  });
});

describe("payment date range and method filters", () => {
  async function setupPayments() {
    const d = baseDeps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    const payments = createMemoryPaymentRepository();
    await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);

    const invoiceFields: InvoiceInput = {
      customerId: customer.id,
      issuedOn: businessDate("2026-04-01"),
      dueOn: null,
      placeOfSupplyStateCode: "27",
      lines: [{ productId: product.id, quantity: quantityFromMajor("5"), discount: money(0n) }],
    };
    const invoice = await createInvoice({ tenantId, actorUserId, fields: invoiceFields, taxContext: taxContext(), ...d });
    const posted = await postInvoice({
      tenantId,
      actorUserId,
      invoiceId: invoice.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });

    const pay = async (date: string, method: "CASH" | "UPI" | "BANK_TRANSFER", amount: bigint) => {
      await recordCustomerPayment({
        tenantId,
        actorUserId,
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        fields: {
          customerId: customer.id,
          receivedOn: businessDate(date),
          method,
          amount: money(amount),
          allocations: [{ invoiceId: posted.id, amount: money(amount) }],
        },
        accounts,
        journals,
        payments,
        ...d,
      });
    };

    await pay("2026-04-05", "CASH", 100_00n);
    await pay("2026-04-15", "UPI", 200_00n);
    await pay("2026-05-01", "BANK_TRANSFER", 300_00n);

    return payments;
  }

  it("filters payments by date range", async () => {
    const payments = await setupPayments();
    const filtered = await listPaymentsPage({
      tenantId,
      fromDate: businessDate("2026-04-01"),
      toDate: businessDate("2026-04-15"),
      page: 1,
      pageSize,
      payments,
    });
    expect(filtered.total).toBe(2);
  });

  it("filters payments by method", async () => {
    const payments = await setupPayments();
    const cash = await listPaymentsPage({
      tenantId,
      method: "CASH",
      page: 1,
      pageSize,
      payments,
    });
    expect(cash.total).toBe(1);
    expect(cash.items[0]?.method).toBe("CASH");
  });

  it("combines method and date range", async () => {
    const payments = await setupPayments();
    const result = await listPaymentsPage({
      tenantId,
      method: "UPI",
      fromDate: businessDate("2026-04-01"),
      toDate: businessDate("2026-04-30"),
      page: 1,
      pageSize,
      payments,
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.method).toBe("UPI");
  });
});

describe("invoice overdue filter and outstanding decoration", () => {
  it("returns only receivable invoices past due when due=OVERDUE", async () => {
    const d = baseDeps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);

    const createPosted = async (dueOn: string) => {
      const invoice = await createInvoice({
        tenantId,
        actorUserId,
        fields: {
          customerId: customer.id,
          issuedOn: businessDate("2026-04-01"),
          dueOn: businessDate(dueOn),
          placeOfSupplyStateCode: "27",
          lines: [
            {
              productId: product.id,
              quantity: quantityFromMajor("1"),
              discount: money(0n),
            },
          ],
        },
        taxContext: taxContext(),
        ...d,
      });
      return postInvoice({
        tenantId,
        actorUserId,
        invoiceId: invoice.id,
        taxContext: taxContext(),
        closedThroughPeriodKey: null,
        accounts,
        journals,
        inventory,
        ...d,
      });
    };

    await createPosted("2026-04-10");
    await createPosted("2026-05-15");

    const filtered = await listInvoicesPage({
      tenantId,
      due: "OVERDUE",
      overdueAsOf: businessDate("2026-04-20"),
      page: 1,
      pageSize,
      sales: d.sales,
    });

    expect(filtered.total).toBe(1);
    expect(filtered.items[0]?.dueOn).toBe(businessDate("2026-04-10"));
  });

  it("excludes fully settled past-due invoices from due=OVERDUE", async () => {
    const payments = createMemoryPaymentRepository();
    const d = {
      ...baseDeps(),
      sales: createMemorySalesRepository([], [], { payments }),
    };
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);

    const invoice = await createInvoice({
      tenantId,
      actorUserId,
      fields: {
        customerId: customer.id,
        issuedOn: businessDate("2026-04-01"),
        dueOn: businessDate("2026-04-10"),
        placeOfSupplyStateCode: "27",
        lines: [
          {
            productId: product.id,
            quantity: quantityFromMajor("1"),
            discount: money(0n),
          },
        ],
      },
      taxContext: taxContext(),
      ...d,
    });
    const posted = await postInvoice({
      tenantId,
      actorUserId,
      invoiceId: invoice.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });

    await payments.createPayment({
      tenantId,
      number: "RCPT/26-27/1",
      customerId: customer.id,
      customerName: customer.name,
      receivedOn: businessDate("2026-04-12"),
      method: "CASH",
      amount: posted.grandTotal,
      reference: null,
      notes: null,
      journalId: "jr-settle",
      allocations: [
        {
          invoiceId: posted.id,
          invoiceNumber: posted.number,
          amount: posted.grandTotal,
        },
      ],
    });

    const asOf = businessDate("2026-04-20");
    const filtered = await listInvoicesPage({
      tenantId,
      due: "OVERDUE",
      overdueAsOf: asOf,
      page: 1,
      pageSize,
      sales: d.sales,
    });
    const [row] = await decorateInvoiceListRows({
      tenantId,
      invoices: [posted],
      payments,
      sales: d.sales,
      asOf,
    });

    expect(posted.status).toBe("POSTED");
    expect(row?.isOverdue).toBe(false);
    expect(filtered.total).toBe(0);
    expect(filtered.items).toHaveLength(0);
  });

  it("decorates invoice rows with outstanding and overdue flags", async () => {
    const d = baseDeps();
    const payments = createMemoryPaymentRepository();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);

    const invoice = await createInvoice({
      tenantId,
      actorUserId,
      fields: {
        customerId: customer.id,
        issuedOn: businessDate("2026-04-01"),
        dueOn: businessDate("2026-04-10"),
        placeOfSupplyStateCode: "27",
        lines: [
          {
            productId: product.id,
            quantity: quantityFromMajor("2"),
            discount: money(0n),
          },
        ],
      },
      taxContext: taxContext(),
      ...d,
    });
    const posted = await postInvoice({
      tenantId,
      actorUserId,
      invoiceId: invoice.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });

    await recordCustomerPayment({
      tenantId,
      actorUserId,
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: customer.id,
        receivedOn: businessDate("2026-04-05"),
        method: "CASH",
        amount: money(100_00n),
        allocations: [{ invoiceId: posted.id, amount: money(100_00n) }],
      },
      accounts,
      journals,
      payments,
      ...d,
    });

    const [row] = await decorateInvoiceListRows({
      tenantId,
      invoices: [posted],
      payments,
      sales: d.sales,
      asOf: businessDate("2026-04-20"),
    });

    expect(row?.outstanding.amountMinor).toBeGreaterThan(0n);
    expect(row?.isOverdue).toBe(true);
  });
});

describe("product date range filters", () => {
  it("filters products by createdAt date range", async () => {
    const catalog = createMemoryCatalogRepository();

    const createAt = async (name: string, sku: string, date: Date) => {
      const p = await createProduct({
        tenantId,
        actorUserId,
        fields: {
          kind: "PRODUCT",
          name,
          sku,
          unitOfMeasurement: "PCS",
          sellingPrice: money(100_00n),
          purchasePrice: money(50_00n),
          taxRateBps: 1800,
          tracksInventory: false,
        },
        catalog,
        audit: createMemoryAuditRepository(),
        outbox: createMemoryOutboxRepository(),
      });
      const record = catalog.records.find((r) => r.id === p.id);
      if (record) {
        (record as { createdAt: Date }).createdAt = date;
      }
      return p;
    };

    await createAt("Widget Alpha", "ALPHA-001", new Date("2026-04-01T10:00:00Z"));
    await createAt("Widget Beta", "BETA-001", new Date("2026-04-15T10:00:00Z"));
    await createAt("Widget Gamma", "GAMMA-001", new Date("2026-05-01T10:00:00Z"));

    const filtered = await listProductsPage({
      tenantId,
      fromDate: "2026-04-01",
      toDate: "2026-04-15",
      page: 1,
      pageSize,
      catalog,
    });
    expect(filtered.total).toBe(2);

    const all = await listProductsPage({ tenantId, page: 1, pageSize, catalog });
    expect(all.total).toBe(3);
  });
});
