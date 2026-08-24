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
  applyCustomerAdvance,
  applyCustomerCredit,
  getCustomerAdvance,
  getInvoiceOutstanding,
  PaymentValidationError,
  recordCustomerPayment,
  unallocatedAmount,
  createMemoryPaymentRepository,
} from "@/modules/payments";
import { projectionFamiliesForEvent } from "@/modules/business-state/application/event-families";

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
      sku: "RICE-ADV",
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

describe("customer advances", () => {
  it("records an unallocated receipt as cash and customer credit", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    const journalCountBefore = seed.journals.listPosted().length;
    const payment = await recordCustomerPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: seed.customer.id,
        receivedOn: businessDate("2026-04-10"),
        method: "UPI",
        amount: money(1000_00n),
        allocations: [],
      },
      ...repos,
    });

    expect(toMajorString(unallocatedAmount(payment))).toBe("1000.00");
    const advance = await getCustomerAdvance({
      tenantId: "tenant-a",
      customerId: seed.customer.id,
      payments: repos.payments,
    });
    expect(toMajorString(advance.unallocated)).toBe("1000.00");
    expect(advance.receiptCount).toBe(1);

    const outstanding = await getInvoiceOutstanding({
      tenantId: "tenant-a",
      invoiceId: seed.invoice.id,
      sales: seed.sales,
      payments: repos.payments,
    });
    expect(toMajorString(outstanding!.outstanding)).toBe("2360.00");

    expect(seed.journals.listPosted().length).toBe(journalCountBefore + 1);
    const journal = seed.journals.listPosted().at(-1)!;
    const cash = await seed.accounts.findByCode("tenant-a", ACCOUNT_CODES.CASH);
    const bank = await seed.accounts.findByCode("tenant-a", ACCOUNT_CODES.BANK);
    const receivable = await seed.accounts.findByCode("tenant-a", ACCOUNT_CODES.RECEIVABLE);
    expect(
      journal.lines.some(
        (line) =>
          (line.accountId === cash?.id || line.accountId === bank?.id) &&
          line.debit.amountMinor === 1000_00n
      )
    ).toBe(true);
    expect(
      journal.lines.some(
        (line) => line.accountId === receivable?.id && line.credit.amountMinor === 1000_00n
      )
    ).toBe(true);
    expect(repos.outbox.events.some((event) => event.eventType === "PaymentReceived")).toBe(
      true
    );
  });

  it("applies credit to an invoice without posting cash again", async () => {
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
        method: "CASH",
        amount: money(1000_00n),
        allocations: [],
      },
      ...repos,
    });
    const journalCount = seed.journals.listPosted().length;

    const updated = await applyCustomerAdvance({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        paymentId: payment.id,
        allocations: [{ invoiceId: seed.invoice.id, amount: money(1000_00n) }],
      },
      payments: repos.payments,
      sales: seed.sales,
      parties: seed.parties,
      audit: repos.audit,
      outbox: repos.outbox,
    });

    expect(toMajorString(unallocatedAmount(updated))).toBe("0.00");
    expect(seed.journals.listPosted().length).toBe(journalCount);
    const invoice = await seed.sales.findInvoiceById("tenant-a", seed.invoice.id);
    expect(invoice?.status).toBe("PARTIALLY_PAID");
    const outstanding = await getInvoiceOutstanding({
      tenantId: "tenant-a",
      invoiceId: seed.invoice.id,
      sales: seed.sales,
      payments: repos.payments,
    });
    expect(toMajorString(outstanding!.outstanding)).toBe("1360.00");
    expect(repos.outbox.events.some((event) => event.eventType === "AdvanceApplied")).toBe(
      true
    );
    expect(projectionFamiliesForEvent("AdvanceApplied")).toEqual([
      "receivablesRisk",
      "attentionQueue",
    ]);
    expect(projectionFamiliesForEvent("AdvanceApplied")).not.toContain("cashPosition");
  });

  it("rejects applying more than the remaining credit or invoice outstanding", async () => {
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
        method: "CASH",
        amount: money(500_00n),
        allocations: [],
      },
      ...repos,
    });

    await expect(
      applyCustomerAdvance({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: {
          paymentId: payment.id,
          allocations: [{ invoiceId: seed.invoice.id, amount: money(600_00n) }],
        },
        payments: repos.payments,
        sales: seed.sales,
        parties: seed.parties,
        audit: repos.audit,
        outbox: repos.outbox,
      })
    ).rejects.toBeInstanceOf(AllocationExceedsPaymentError);

    await expect(
      applyCustomerCredit({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: {
          customerId: seed.customer.id,
          allocations: [{ invoiceId: seed.invoice.id, amount: money(3000_00n) }],
        },
        payments: repos.payments,
        sales: seed.sales,
        parties: seed.parties,
        audit: repos.audit,
        outbox: repos.outbox,
      })
    ).rejects.toBeInstanceOf(PaymentValidationError);

    await expect(
      applyCustomerAdvance({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: {
          paymentId: payment.id,
          allocations: [{ invoiceId: seed.invoice.id, amount: money(500_00n) }],
        },
        payments: repos.payments,
        sales: seed.sales,
        parties: seed.parties,
        audit: repos.audit,
        outbox: repos.outbox,
      })
    ).resolves.toMatchObject({ id: payment.id });

    await expect(
      applyCustomerAdvance({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: {
          paymentId: payment.id,
          allocations: [{ invoiceId: seed.invoice.id, amount: money(1_00n) }],
        },
        payments: repos.payments,
        sales: seed.sales,
        parties: seed.parties,
        audit: repos.audit,
        outbox: repos.outbox,
      })
    ).rejects.toBeInstanceOf(PaymentValidationError);
  });

  it("applies FIFO customer credit across receipts", async () => {
    const seed = await postedInvoice();
    const repos = paymentRepos(seed);
    await recordCustomerPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: seed.customer.id,
        receivedOn: businessDate("2026-04-08"),
        method: "CASH",
        amount: money(400_00n),
        allocations: [],
      },
      ...repos,
    });
    await recordCustomerPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        customerId: seed.customer.id,
        receivedOn: businessDate("2026-04-09"),
        method: "UPI",
        amount: money(400_00n),
        allocations: [],
      },
      ...repos,
    });

    await applyCustomerCredit({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        customerId: seed.customer.id,
        allocations: [{ invoiceId: seed.invoice.id, amount: money(600_00n) }],
      },
      payments: repos.payments,
      sales: seed.sales,
      parties: seed.parties,
      audit: repos.audit,
      outbox: repos.outbox,
    });

    const advance = await getCustomerAdvance({
      tenantId: "tenant-a",
      customerId: seed.customer.id,
      payments: repos.payments,
    });
    expect(toMajorString(advance.unallocated)).toBe("200.00");
    expect(advance.receiptCount).toBe(1);
    const outstanding = await getInvoiceOutstanding({
      tenantId: "tenant-a",
      invoiceId: seed.invoice.id,
      sales: seed.sales,
      payments: repos.payments,
    });
    expect(toMajorString(outstanding!.outstanding)).toBe("1760.00");
  });

  it("rejects applying more than invoice outstanding", async () => {
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
        method: "CASH",
        amount: money(3000_00n),
        allocations: [],
      },
      ...repos,
    });

    await expect(
      applyCustomerAdvance({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: {
          paymentId: payment.id,
          allocations: [{ invoiceId: seed.invoice.id, amount: money(3000_00n) }],
        },
        payments: repos.payments,
        sales: seed.sales,
        parties: seed.parties,
        audit: repos.audit,
        outbox: repos.outbox,
      })
    ).rejects.toBeInstanceOf(AllocationExceedsOutstandingError);
  });
});
