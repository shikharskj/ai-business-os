import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import {
  ACCOUNT_CODES,
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
import { createMemoryInventoryRepository, quantityFromMajor } from "@/modules/inventory";
import {
  createInvoice,
  createMemorySalesRepository,
  postInvoice,
  type InvoiceInput,
  type SalesTaxContext,
} from "@/modules/sales";
import {
  AllocationExceedsOutstandingError,
  AllocationExceedsPaymentError,
  getCustomerOutstanding,
  getInvoiceOutstanding,
  getPayment,
  PaymentNotFoundError,
  PaymentValidationError,
  recordCustomerPayment,
  remainingOutstanding,
  validateAllocations,
  createMemoryPaymentRepository,
} from "@/modules/payments";

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

function invoiceDeps() {
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
  tenantId = "tenant-a"
) {
  return createProduct({
    tenantId,
    actorUserId: "user-1",
    fields: {
      kind: "PRODUCT",
      name: "Basmati Rice 25kg",
      sku: "RICE-PAY",
      unitOfMeasurement: "KG",
      sellingPrice: money(1000_00n),
      purchasePrice: money(800_00n),
      hsnSac: "10063010",
      taxRateBps: 1800,
      tracksInventory: false,
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

async function postedInvoice(tenantId = "tenant-a") {
  const d = invoiceDeps();
  const accounts = createMemoryAccountRepository();
  const journals = createMemoryJournalRepository();
  const inventory = createMemoryInventoryRepository();
  await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
  const customer = await seedCustomer(d.parties, tenantId);
  const product = await seedProduct(d.catalog, tenantId);
  const draft = await createInvoice({
    tenantId,
    actorUserId: "user-1",
    fields: invoiceFields(customer.id, product.id),
    taxContext: taxContext(),
    ...d,
  });
  const posted = await postInvoice({
    tenantId,
    actorUserId: "user-1",
    invoiceId: draft.id,
    taxContext: taxContext(),
    closedThroughPeriodKey: null,
    accounts,
    journals,
    inventory,
    ...d,
  });
  return { ...d, accounts, journals, customer, product, invoice: posted };
}

function paymentRepos(seed: Awaited<ReturnType<typeof postedInvoice>>) {
  return {
    payments: createMemoryPaymentRepository(),
    sales: seed.sales,
    parties: seed.parties,
    accounts: seed.accounts,
    journals: seed.journals,
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  };
}

describe("payment allocation rules", () => {
  it("rejects allocation greater than invoice outstanding", () => {
    expect(() =>
      validateAllocations({
        customerId: "cust-1",
        paymentAmount: money(500_00n),
        allocations: [{ invoiceId: "inv-1", amount: money(500_00n) }],
        invoices: [
          { invoiceId: "inv-1", customerId: "cust-1", outstanding: money(200_00n) },
        ],
      })
    ).toThrow(AllocationExceedsOutstandingError);
  });

  it("rejects allocation greater than the payment amount", () => {
    expect(() =>
      validateAllocations({
        customerId: "cust-1",
        paymentAmount: money(100_00n),
        allocations: [{ invoiceId: "inv-1", amount: money(200_00n) }],
        invoices: [
          { invoiceId: "inv-1", customerId: "cust-1", outstanding: money(500_00n) },
        ],
      })
    ).toThrow(AllocationExceedsPaymentError);
  });

  it("computes remaining outstanding without going negative", () => {
    expect(toMajorString(remainingOutstanding(money(2360_00n), money(360_00n)))).toBe(
      "2000.00"
    );
    expect(() => remainingOutstanding(money(100_00n), money(101_00n))).toThrow(
      AllocationExceedsOutstandingError
    );
  });
});

describe("customer payments", () => {
  it("records a partial payment and leaves remaining outstanding", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    const payment = await recordCustomerPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: seed.customer.id,
        receivedOn: businessDate("2026-04-10"),
        method: "UPI",
        amount: money(360_00n),
        allocations: [{ invoiceId: seed.invoice.id, amount: money(360_00n) }],
      },
      ...repos,
    });

    expect(payment.number).toMatch(/^RCP\/FY2026-27\/\d{4}$/);
    const invoice = await seed.sales.findInvoiceById("tenant-a", seed.invoice.id);
    expect(invoice?.status).toBe("PARTIALLY_PAID");
    const outstanding = await getInvoiceOutstanding({
      tenantId: "tenant-a",
      invoiceId: seed.invoice.id,
      sales: seed.sales,
      payments: repos.payments,
    });
    expect(toMajorString(outstanding!.outstanding)).toBe("2000.00");
    expect(repos.outbox.events.some((event) => event.eventType === "PaymentReceived")).toBe(
      true
    );
  });

  it("marks the invoice paid when the remaining outstanding is cleared", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    await recordCustomerPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: seed.customer.id,
        receivedOn: businessDate("2026-04-10"),
        method: "CASH",
        amount: money(2360_00n),
        allocations: [{ invoiceId: seed.invoice.id, amount: money(2360_00n) }],
      },
      ...repos,
    });
    const invoice = await seed.sales.findInvoiceById("tenant-a", seed.invoice.id);
    expect(invoice?.status).toBe("PAID");
    const customerOutstanding = await getCustomerOutstanding({
      tenantId: "tenant-a",
      customerId: seed.customer.id,
      sales: seed.sales,
      payments: repos.payments,
    });
    expect(toMajorString(customerOutstanding.outstanding)).toBe("0.00");
    expect(customerOutstanding.openInvoiceCount).toBe(0);
    expect(customerOutstanding.hasPostedInvoices).toBe(true);
  });

  it("posts a balanced receipt journal to cash or bank", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    await recordCustomerPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: seed.customer.id,
        receivedOn: businessDate("2026-04-10"),
        method: "CASH",
        amount: money(2360_00n),
        allocations: [{ invoiceId: seed.invoice.id, amount: money(2360_00n) }],
      },
      ...repos,
    });
    const journal = seed.journals.listPosted().at(-1)!;
    const debits = journal.lines.reduce((sum, line) => sum + line.debit.amountMinor, 0n);
    const credits = journal.lines.reduce((sum, line) => sum + line.credit.amountMinor, 0n);
    expect(debits).toBe(credits);
    expect(debits).toBe(2360_00n);
    const cash = await seed.accounts.findByCode("tenant-a", ACCOUNT_CODES.CASH);
    const receivable = await seed.accounts.findByCode("tenant-a", ACCOUNT_CODES.RECEIVABLE);
    expect(journal.lines.some((line) => line.accountId === cash?.id && line.debit.amountMinor === 2360_00n)).toBe(true);
    expect(
      journal.lines.some(
        (line) => line.accountId === receivable?.id && line.credit.amountMinor === 2360_00n
      )
    ).toBe(true);
  });

  it("rejects over-allocation against invoice outstanding", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    await expect(
      recordCustomerPayment({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        fields: {
          customerId: seed.customer.id,
          receivedOn: businessDate("2026-04-10"),
          method: "CARD",
          amount: money(3000_00n),
          allocations: [{ invoiceId: seed.invoice.id, amount: money(3000_00n) }],
        },
        ...repos,
      })
    ).rejects.toBeInstanceOf(AllocationExceedsOutstandingError);
  });

  it("rejects allocating more than the payment amount", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    await expect(
      recordCustomerPayment({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        fields: {
          customerId: seed.customer.id,
          receivedOn: businessDate("2026-04-10"),
          method: "BANK_TRANSFER",
          amount: money(100_00n),
          allocations: [{ invoiceId: seed.invoice.id, amount: money(200_00n) }],
        },
        ...repos,
      })
    ).rejects.toBeInstanceOf(AllocationExceedsPaymentError);
  });

  it("keeps customer outstanding equal to unpaid invoice remainders", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    await recordCustomerPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: seed.customer.id,
        receivedOn: businessDate("2026-04-10"),
        method: "CHEQUE",
        amount: money(360_00n),
        allocations: [{ invoiceId: seed.invoice.id, amount: money(360_00n) }],
      },
      ...repos,
    });
    const customerOutstanding = await getCustomerOutstanding({
      tenantId: "tenant-a",
      customerId: seed.customer.id,
      sales: seed.sales,
      payments: repos.payments,
    });
    const invoiceOutstanding = await getInvoiceOutstanding({
      tenantId: "tenant-a",
      invoiceId: seed.invoice.id,
      sales: seed.sales,
      payments: repos.payments,
    });
    expect(toMajorString(customerOutstanding.outstanding)).toBe(
      toMajorString(invoiceOutstanding!.outstanding)
    );
    expect(customerOutstanding.openInvoiceCount).toBe(1);
  });

  it("rejects cross-tenant payment access", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    const payment = await recordCustomerPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: seed.customer.id,
        receivedOn: businessDate("2026-04-10"),
        method: "UPI",
        amount: money(360_00n),
        allocations: [{ invoiceId: seed.invoice.id, amount: money(360_00n) }],
      },
      ...repos,
    });
    await expect(
      getPayment({ tenantId: "tenant-b", paymentId: payment.id, payments: repos.payments })
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
  });

  it("rejects allocating another tenant's invoice", async () => {
    const seed = await postedInvoice("tenant-a");
    const other = await postedInvoice("tenant-b");
    const repos = paymentRepos(seed);
    await expect(
      recordCustomerPayment({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        fields: {
          customerId: seed.customer.id,
          receivedOn: businessDate("2026-04-10"),
          method: "CASH",
          amount: money(360_00n),
          allocations: [{ invoiceId: other.invoice.id, amount: money(360_00n) }],
        },
        ...repos,
      })
    ).rejects.toBeInstanceOf(PaymentValidationError);
  });
});
