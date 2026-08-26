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
import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";
import { createProduct } from "@/modules/catalog";
import { createMemoryCatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import { createSupplier } from "@/modules/party";
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
  createMemoryPurchasesRepository,
  createPurchase,
  getPurchase,
  postPurchase,
  PurchaseAlreadyPostedError,
  PurchaseNotFoundError,
  PurchaseStatusError,
  updatePurchase,
  type PurchaseInput,
  type PurchaseTaxContext,
} from "@/modules/purchases";
import {
  createMemorySupplierPaymentRepository,
  getSupplierOutstanding,
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

function deps() {
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

function purchaseFields(supplierId: string, productId: string): PurchaseInput {
  return {
    supplierId,
    issuedOn: businessDate("2026-04-02"),
    dueOn: businessDate("2026-04-16"),
    placeOfSupplyStateCode: "27",
    lines: [{ productId, quantity: quantityFromMajor("2"), discount: money(0n) }],
  };
}

describe("purchases", () => {
  it("creates a draft purchase with GST from the tax engine", async () => {
    const d = deps();
    const supplier = await seedSupplier(d.parties);
    const product = await seedProduct(d.catalog);
    const purchase = await createPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: purchaseFields(supplier.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    expect(purchase.status).toBe("DRAFT");
    expect(purchase.number).toMatch(/^BILL\/FY2026-27\/\d{4}$/);
    // 2 × 800 = 1600 taxable + 18% = 288 tax → 1888
    expect(toMajorString(purchase.grandTotal)).toBe("1888.00");
    expect(d.outbox.events.at(-1)?.eventType).toBe("PurchaseCreated");
  });

  it("posts a purchase with balanced journal, inventory IN, and payable outstanding", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId: "tenant-a", accountRepository: accounts });
    const supplier = await seedSupplier(d.parties);
    const product = await seedProduct(d.catalog, "tenant-a", true);
    const draft = await createPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: purchaseFields(supplier.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    const posted = await postPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      purchaseId: draft.id,
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

    const payable = journal.lines.find((line) => line.accountCode === ACCOUNT_CODES.PAYABLE);
    const inventoryLine = journal.lines.find(
      (line) => line.accountCode === ACCOUNT_CODES.INVENTORY
    );
    const inputGst = journal.lines.find((line) => line.accountCode === ACCOUNT_CODES.INPUT_GST);
    expect(payable?.credit.amountMinor).toBe(posted.grandTotal.amountMinor);
    expect(inventoryLine?.debit.amountMinor).toBe(posted.taxableAmount.amountMinor);
    expect(inputGst?.debit.amountMinor).toBe(posted.totalTax.amountMinor);

    const movements = await inventory.listMovements("tenant-a", product.id);
    expect(movements.some((m) => m.cause === "PURCHASE" && m.direction === "IN")).toBe(true);
    expect(d.outbox.events.some((e) => e.eventType === "PurchasePosted")).toBe(true);

    const outstanding = await getSupplierOutstanding({
      tenantId: "tenant-a",
      supplierId: supplier.id,
      purchases: d.purchases,
      supplierPayments: createMemorySupplierPaymentRepository(),
    });
    expect(toMajorString(outstanding.outstanding)).toBe(toMajorString(posted.grandTotal));
    expect(outstanding.openBillCount).toBe(1);
  });

  it("rejects posting twice", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId: "tenant-a", accountRepository: accounts });
    const supplier = await seedSupplier(d.parties);
    const product = await seedProduct(d.catalog);
    const draft = await createPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: purchaseFields(supplier.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    await postPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      purchaseId: draft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    await expect(
      postPurchase({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        purchaseId: draft.id,
        taxContext: taxContext(),
        closedThroughPeriodKey: null,
        accounts,
        journals,
        inventory,
        ...d,
      })
    ).rejects.toBeInstanceOf(PurchaseAlreadyPostedError);
  });

  it("rejects cross-tenant get by id", async () => {
    const d = deps();
    const supplier = await seedSupplier(d.parties);
    const product = await seedProduct(d.catalog);
    const purchase = await createPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: purchaseFields(supplier.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    await expect(
      getPurchase({
        tenantId: "tenant-b",
        purchaseId: purchase.id,
        purchases: d.purchases,
      })
    ).rejects.toBeInstanceOf(PurchaseNotFoundError);
  });

  it("rejects silent edit of posted purchase amounts", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    await ensureChartOfAccounts({ tenantId: "tenant-a", accountRepository: accounts });
    const supplier = await seedSupplier(d.parties);
    const product = await seedProduct(d.catalog);
    const draft = await createPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: purchaseFields(supplier.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    await postPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      purchaseId: draft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    await expect(
      updatePurchase({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        purchaseId: draft.id,
        fields: purchaseFields(supplier.id, product.id),
        taxContext: taxContext(),
        ...d,
      })
    ).rejects.toBeInstanceOf(PurchaseStatusError);
  });

  it("keeps draft and skips posted outbox when inventory fails on post", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    await ensureChartOfAccounts({ tenantId: "tenant-a", accountRepository: accounts });
    const supplier = await seedSupplier(d.parties);
    const product = await seedProduct(d.catalog, "tenant-a", true);
    const draft = await createPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: purchaseFields(supplier.id, product.id),
      taxContext: taxContext(),
      ...d,
    });

    const inventory = createMemoryInventoryRepository();
    inventory.appendMovement = async () => {
      throw new Error("inventory write failed");
    };

    await expect(
      postPurchase({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        purchaseId: draft.id,
        taxContext: taxContext(),
        closedThroughPeriodKey: null,
        accounts,
        journals,
        inventory,
        ...d,
      })
    ).rejects.toThrow("inventory write failed");

    const stillDraft = await getPurchase({
      tenantId: "tenant-a",
      purchaseId: draft.id,
      purchases: d.purchases,
    });
    expect(stillDraft.status).toBe("DRAFT");
    expect(stillDraft.journalId).toBeNull();
    expect(d.outbox.events.some((e) => e.eventType === "PurchasePosted")).toBe(false);
  });

  it("defaults place of supply to business state (IGST for KA supplier + MH business)", async () => {
    const d = deps();
    const karnatakaGstin = "29AABCU9603R1ZV";
    const supplier = await createSupplier({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        name: "KA Wholesalers",
        gstRegistrationStatus: "REGISTERED",
        gstin: karnatakaGstin,
        state: "Karnataka",
      },
      parties: d.parties,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });
    const product = await seedProduct(d.catalog);
    const purchase = await createPurchase({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        supplierId: supplier.id,
        issuedOn: businessDate("2026-04-02"),
        // No explicit PoS — should default to Maharashtra (business)
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
    expect(purchase.placeOfSupplyStateCode).toBe("27");
    expect(purchase.supplyType).toBe("INTER_STATE");
    expect(toMajorString(purchase.igst)).toBe("288.00");
    expect(toMajorString(purchase.cgst)).toBe("0.00");
    expect(toMajorString(purchase.sgst)).toBe("0.00");
  });
});
