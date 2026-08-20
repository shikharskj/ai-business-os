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
import { createSupplier } from "@/modules/party";
import { createMemoryPartyRepository } from "@/modules/party/infrastructure/repositories";
import {
  createMemoryHsnSacRepository,
  createMemoryTaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";
import { createMemoryInventoryRepository, quantityFromMajor } from "@/modules/inventory";
import {
  createMemoryPurchasesRepository,
  createPurchase,
  postPurchase,
  type PurchaseInput,
  type PurchaseTaxContext,
} from "@/modules/purchases";
import {
  AllocationExceedsOutstandingError,
  AllocationExceedsPaymentError,
  createMemorySupplierPaymentRepository,
  getPurchaseOutstanding,
  getSupplierOutstanding,
  getSupplierPayment,
  PaymentNotFoundError,
  PaymentValidationError,
  recordSupplierPayment,
  validatePurchaseAllocations,
} from "@/modules/payments";

const maharashtraGstin = "27AABCU9603R1ZM";

function taxContext(): PurchaseTaxContext {
  return {
    gstin: maharashtraGstin,
    gstRegistrationStatus: "REGISTERED",
    stateName: "Maharashtra",
    defaultGstRateBps: 1800,
    financialYearStartMonth: 4,
    currency: "INR",
  };
}

function purchaseDeps() {
  return {
    purchases: createMemoryPurchasesRepository(),
    parties: createMemoryPartyRepository(),
    catalog: createMemoryCatalogRepository(),
    taxRates: createMemoryTaxRateRepository(),
    hsnSac: createMemoryHsnSacRepository(),
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  };
}

async function seedSupplier(
  parties: ReturnType<typeof createMemoryPartyRepository>,
  tenantId = "tenant-a"
) {
  return createSupplier({
    tenantId,
    actorUserId: "user-1",
    fields: {
      name: "XYZ Wholesalers",
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
      sku: "RICE-PAY-SUP",
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

function purchaseFields(supplierId: string, productId: string): PurchaseInput {
  return {
    supplierId,
    issuedOn: businessDate("2026-04-02"),
    dueOn: businessDate("2026-04-16"),
    placeOfSupplyStateCode: "27",
    lines: [
      {
        productId,
        quantity: quantityFromMajor("2"),
        unitPrice: money(800_00n),
        discount: money(0n),
      },
    ],
  };
}

async function postedPurchase(tenantId = "tenant-a") {
  const d = purchaseDeps();
  const accounts = createMemoryAccountRepository();
  const journals = createMemoryJournalRepository();
  const inventory = createMemoryInventoryRepository();
  await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
  const supplier = await seedSupplier(d.parties, tenantId);
  const product = await seedProduct(d.catalog, tenantId);
  const draft = await createPurchase({
    tenantId,
    actorUserId: "user-1",
    fields: purchaseFields(supplier.id, product.id),
    taxContext: taxContext(),
    ...d,
  });
  const posted = await postPurchase({
    tenantId,
    actorUserId: "user-1",
    purchaseId: draft.id,
    taxContext: taxContext(),
    closedThroughPeriodKey: null,
    accounts,
    journals,
    inventory,
    ...d,
  });
  return { ...d, accounts, journals, supplier, product, purchase: posted };
}

function paymentRepos(seed: Awaited<ReturnType<typeof postedPurchase>>) {
  return {
    supplierPayments: createMemorySupplierPaymentRepository(),
    purchases: seed.purchases,
    parties: seed.parties,
    accounts: seed.accounts,
    journals: seed.journals,
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  };
}

describe("supplier payment allocation rules", () => {
  it("rejects allocation greater than purchase outstanding", () => {
    expect(() =>
      validatePurchaseAllocations({
        supplierId: "sup-1",
        paymentAmount: money(500_00n),
        allocations: [{ purchaseId: "bill-1", amount: money(500_00n) }],
        purchases: [
          { purchaseId: "bill-1", supplierId: "sup-1", outstanding: money(200_00n) },
        ],
      })
    ).toThrow(AllocationExceedsOutstandingError);
  });

  it("rejects allocation greater than the payment amount", () => {
    expect(() =>
      validatePurchaseAllocations({
        supplierId: "sup-1",
        paymentAmount: money(100_00n),
        allocations: [{ purchaseId: "bill-1", amount: money(200_00n) }],
        purchases: [
          { purchaseId: "bill-1", supplierId: "sup-1", outstanding: money(500_00n) },
        ],
      })
    ).toThrow(AllocationExceedsPaymentError);
  });
});

describe("supplier payments", () => {
  it("records a partial payment and leaves remaining payable", async () => {
    const seed = await postedPurchase();
    const repos = paymentRepos(seed);
    const payment = await recordSupplierPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        supplierId: seed.supplier.id,
        paidOn: businessDate("2026-04-10"),
        method: "UPI",
        amount: money(360_00n),
        allocations: [{ purchaseId: seed.purchase.id, amount: money(360_00n) }],
      },
      ...repos,
    });

    expect(payment.number).toMatch(/^PAY\/FY2026-27\/\d{4}$/);
    const bill = await seed.purchases.findPurchaseById("tenant-a", seed.purchase.id);
    expect(bill?.status).toBe("PARTIALLY_PAID");
    const outstanding = await getPurchaseOutstanding({
      tenantId: "tenant-a",
      purchaseId: seed.purchase.id,
      purchases: seed.purchases,
      supplierPayments: repos.supplierPayments,
    });
    expect(toMajorString(outstanding!.outstanding)).toBe(
      toMajorString(money(seed.purchase.grandTotal.amountMinor - 360_00n))
    );
    expect(repos.outbox.events.some((event) => event.eventType === "PaymentMade")).toBe(true);
  });

  it("marks the purchase paid when remaining outstanding is cleared", async () => {
    const seed = await postedPurchase();
    const repos = paymentRepos(seed);
    await recordSupplierPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        supplierId: seed.supplier.id,
        paidOn: businessDate("2026-04-10"),
        method: "CASH",
        amount: seed.purchase.grandTotal,
        allocations: [
          { purchaseId: seed.purchase.id, amount: seed.purchase.grandTotal },
        ],
      },
      ...repos,
    });
    const bill = await seed.purchases.findPurchaseById("tenant-a", seed.purchase.id);
    expect(bill?.status).toBe("PAID");
    const supplierOutstanding = await getSupplierOutstanding({
      tenantId: "tenant-a",
      supplierId: seed.supplier.id,
      purchases: seed.purchases,
      supplierPayments: repos.supplierPayments,
    });
    expect(toMajorString(supplierOutstanding.outstanding)).toBe("0.00");
    expect(supplierOutstanding.openBillCount).toBe(0);
    expect(supplierOutstanding.hasPostedPurchases).toBe(true);
  });

  it("posts a balanced payable payment journal", async () => {
    const seed = await postedPurchase();
    const repos = paymentRepos(seed);
    const amount = seed.purchase.grandTotal;
    await recordSupplierPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        supplierId: seed.supplier.id,
        paidOn: businessDate("2026-04-10"),
        method: "CASH",
        amount,
        allocations: [{ purchaseId: seed.purchase.id, amount }],
      },
      ...repos,
    });
    const journal = seed.journals.listPosted().at(-1)!;
    const debits = journal.lines.reduce((sum, line) => sum + line.debit.amountMinor, 0n);
    const credits = journal.lines.reduce((sum, line) => sum + line.credit.amountMinor, 0n);
    expect(debits).toBe(credits);
    expect(debits).toBe(amount.amountMinor);
    const cash = await seed.accounts.findByCode("tenant-a", ACCOUNT_CODES.CASH);
    const payable = await seed.accounts.findByCode("tenant-a", ACCOUNT_CODES.PAYABLE);
    expect(
      journal.lines.some(
        (line) => line.accountId === payable?.id && line.debit.amountMinor === amount.amountMinor
      )
    ).toBe(true);
    expect(
      journal.lines.some(
        (line) => line.accountId === cash?.id && line.credit.amountMinor === amount.amountMinor
      )
    ).toBe(true);
  });

  it("rejects over-allocation against purchase outstanding", async () => {
    const seed = await postedPurchase();
    const repos = paymentRepos(seed);
    await expect(
      recordSupplierPayment({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        fields: {
          supplierId: seed.supplier.id,
          paidOn: businessDate("2026-04-10"),
          method: "CARD",
          amount: money(seed.purchase.grandTotal.amountMinor + 100_00n),
          allocations: [
            {
              purchaseId: seed.purchase.id,
              amount: money(seed.purchase.grandTotal.amountMinor + 100_00n),
            },
          ],
        },
        ...repos,
      })
    ).rejects.toBeInstanceOf(AllocationExceedsOutstandingError);
  });

  it("rejects cross-tenant payment access", async () => {
    const seed = await postedPurchase();
    const repos = paymentRepos(seed);
    const payment = await recordSupplierPayment({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      fields: {
        supplierId: seed.supplier.id,
        paidOn: businessDate("2026-04-10"),
        method: "UPI",
        amount: money(360_00n),
        allocations: [{ purchaseId: seed.purchase.id, amount: money(360_00n) }],
      },
      ...repos,
    });
    await expect(
      getSupplierPayment({
        tenantId: "tenant-b",
        paymentId: payment.id,
        supplierPayments: repos.supplierPayments,
      })
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
  });

  it("rejects allocating another tenant's purchase bill", async () => {
    const seed = await postedPurchase("tenant-a");
    const otherSupplier = await seedSupplier(seed.parties, "tenant-b");
    const otherProduct = await seedProduct(seed.catalog, "tenant-b");
    const otherDraft = await createPurchase({
      tenantId: "tenant-b",
      actorUserId: "user-1",
      fields: purchaseFields(otherSupplier.id, otherProduct.id),
      taxContext: taxContext(),
      purchases: seed.purchases,
      parties: seed.parties,
      catalog: seed.catalog,
      taxRates: seed.taxRates,
      hsnSac: seed.hsnSac,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });
    const otherPurchase = await postPurchase({
      tenantId: "tenant-b",
      actorUserId: "user-1",
      purchaseId: otherDraft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts: seed.accounts,
      journals: seed.journals,
      inventory: createMemoryInventoryRepository(),
      purchases: seed.purchases,
      parties: seed.parties,
      catalog: seed.catalog,
      taxRates: seed.taxRates,
      hsnSac: seed.hsnSac,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });
    const repos = paymentRepos(seed);
    await expect(
      recordSupplierPayment({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        fields: {
          supplierId: seed.supplier.id,
          paidOn: businessDate("2026-04-10"),
          method: "CASH",
          amount: money(360_00n),
          allocations: [{ purchaseId: otherPurchase.id, amount: money(360_00n) }],
        },
        ...repos,
      })
    ).rejects.toBeInstanceOf(PaymentValidationError);
  });
});
