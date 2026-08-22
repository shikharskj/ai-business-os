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
import { createSupplier } from "@/modules/party";
import { createMemoryPartyRepository } from "@/modules/party/infrastructure/repositories";
import {
  createMemoryHsnSacRepository,
  createMemoryTaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";
import { createMemoryInventoryRepository, quantityFromMajor } from "@/modules/inventory";
import { createMemorySupplierPaymentRepository } from "@/modules/payments";
import { remainingDocumentBalance } from "@/modules/payments/domain/allocation";
import {
  createMemoryPurchasesRepository,
  createPurchase,
  createPurchaseReturn,
  postPurchase,
  postPurchaseReturn,
  PurchaseReturnAlreadyPostedError,
  PurchaseReturnValidationError,
  type PurchaseInput,
  type PurchaseTaxContext,
} from "@/modules/purchases";

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
      sku: tracksInventory ? "RICE-PR" : "RICE-SVC",
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
    placeOfSupplyStateCode: "27",
    lines: [{ productId, quantity: quantityFromMajor("2") }],
  };
}

describe("purchase returns", () => {
  it("posts a return with a balanced journal, stock out, and reduced payable", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    const supplierPayments = createMemorySupplierPaymentRepository();
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
    const returnDraft = await createPurchaseReturn({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        purchaseId: posted.id,
        issuedOn: businessDate("2026-04-04"),
        lines: [{ purchaseLineId: posted.lines[0]!.id, quantity: quantityFromMajor("1") }],
      },
      taxContext: taxContext(),
      ...d,
    });
    expect(returnDraft.number).toMatch(/^PR\/FY2026-27\/\d{4}$/);
    const postedReturn = await postPurchaseReturn({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      purchaseReturnId: returnDraft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      supplierPayments,
      ...d,
    });
    expect(postedReturn.status).toBe("POSTED");
    const journal = journals.listPosted().find((row) => row.sourceId === postedReturn.id)!;
    const debits = journal.lines.reduce((sum, line) => sum + line.debit.amountMinor, 0n);
    const credits = journal.lines.reduce((sum, line) => sum + line.credit.amountMinor, 0n);
    expect(debits).toBe(credits);
    const movements = await inventory.listMovements("tenant-a", product.id);
    expect(movements.some((m) => m.cause === "RETURN" && m.direction === "OUT")).toBe(true);
    expect(d.outbox.events.some((e) => e.eventType === "PurchaseReturnPosted")).toBe(true);
    const returned = await d.purchases.returnedTotalsForPurchases("tenant-a", [posted.id]);
    const outstanding = remainingDocumentBalance(
      posted.grandTotal,
      money(0n),
      returned.get(posted.id) ?? money(0n)
    );
    expect(toMajorString(outstanding)).toBe(toMajorString(postedReturn.grandTotal));
  });

  it("rejects returning more than remaining quantity and posting twice", async () => {
    const d = deps();
    const accounts = createMemoryAccountRepository();
    const journals = createMemoryJournalRepository();
    const inventory = createMemoryInventoryRepository();
    const supplierPayments = createMemorySupplierPaymentRepository();
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
    await expect(
      createPurchaseReturn({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: {
          purchaseId: posted.id,
          issuedOn: businessDate("2026-04-04"),
          lines: [{ purchaseLineId: posted.lines[0]!.id, quantity: quantityFromMajor("3") }],
        },
        taxContext: taxContext(),
        ...d,
      })
    ).rejects.toBeInstanceOf(PurchaseReturnValidationError);

    const returnDraft = await createPurchaseReturn({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        purchaseId: posted.id,
        issuedOn: businessDate("2026-04-04"),
        lines: [{ purchaseLineId: posted.lines[0]!.id, quantity: quantityFromMajor("1") }],
      },
      taxContext: taxContext(),
      ...d,
    });
    await postPurchaseReturn({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      purchaseReturnId: returnDraft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      supplierPayments,
      ...d,
    });
    await expect(
      postPurchaseReturn({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        purchaseReturnId: returnDraft.id,
        taxContext: taxContext(),
        closedThroughPeriodKey: null,
        accounts,
        journals,
        inventory,
        supplierPayments,
        ...d,
      })
    ).rejects.toBeInstanceOf(PurchaseReturnAlreadyPostedError);
  });
});
