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
import {
  createMemoryInventoryRepository,
  quantityFromMajor,
  recordOpeningStock,
} from "@/modules/inventory";
import { createMemoryPaymentRepository } from "@/modules/payments";
import { remainingDocumentBalance } from "@/modules/payments/domain/allocation";
import {
  CreditNoteAlreadyPostedError,
  CreditNoteValidationError,
  createCreditNote,
  createInvoice,
  createMemorySalesRepository,
  postCreditNote,
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
    payments: createMemoryPaymentRepository(),
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

describe("sales credit notes", () => {
  it("posts a credit note with a balanced journal, stock in, and reduced outstanding", async () => {
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
    const creditDraft = await createCreditNote({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        invoiceId: posted.id,
        issuedOn: businessDate("2026-04-03"),
        lines: [{ invoiceLineId: posted.lines[0]!.id, quantity: quantityFromMajor("1") }],
      },
      taxContext: taxContext(),
      ...d,
    });
    expect(creditDraft.number).toMatch(/^CN\/FY2026-27\/\d{4}$/);
    expect(creditDraft.status).toBe("DRAFT");
    expect(toMajorString(creditDraft.grandTotal)).toBe("1180.00");

    const creditPosted = await postCreditNote({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      creditNoteId: creditDraft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    expect(creditPosted.status).toBe("POSTED");
    const journal = journals.listPosted().find((row) => row.sourceId === creditPosted.id)!;
    const debits = journal.lines.reduce((sum, line) => sum + line.debit.amountMinor, 0n);
    const credits = journal.lines.reduce((sum, line) => sum + line.credit.amountMinor, 0n);
    expect(debits).toBe(credits);
    const movements = await inventory.listMovements("tenant-a", product.id);
    expect(movements.some((m) => m.cause === "RETURN" && m.direction === "IN")).toBe(true);
    expect(d.outbox.events.some((e) => e.eventType === "CreditNotePosted")).toBe(true);

    const credited = await d.sales.creditedTotalsForInvoices("tenant-a", [posted.id]);
    const outstanding = remainingDocumentBalance(
      posted.grandTotal,
      money(0n),
      credited.get(posted.id) ?? money(0n)
    );
    expect(toMajorString(outstanding)).toBe("1180.00");
  });

  it("rejects crediting more than remaining quantity and posting twice", async () => {
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
    await expect(
      createCreditNote({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: {
          invoiceId: posted.id,
          issuedOn: businessDate("2026-04-03"),
          lines: [{ invoiceLineId: posted.lines[0]!.id, quantity: quantityFromMajor("3") }],
        },
        taxContext: taxContext(),
        ...d,
      })
    ).rejects.toBeInstanceOf(CreditNoteValidationError);

    const creditDraft = await createCreditNote({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        invoiceId: posted.id,
        issuedOn: businessDate("2026-04-03"),
        lines: [{ invoiceLineId: posted.lines[0]!.id, quantity: quantityFromMajor("2") }],
      },
      taxContext: taxContext(),
      ...d,
    });
    await postCreditNote({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      creditNoteId: creditDraft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    await expect(
      postCreditNote({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        creditNoteId: creditDraft.id,
        taxContext: taxContext(),
        closedThroughPeriodKey: null,
        accounts,
        journals,
        inventory,
        ...d,
      })
    ).rejects.toBeInstanceOf(CreditNoteAlreadyPostedError);
  });

  it("rejects a credit that exceeds remaining invoice balance after payment", async () => {
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
    await d.payments.createPayment({
      tenantId: "tenant-a",
      number: "RCP/FY2026-27/0001",
      customerId: customer.id,
      customerName: customer.name,
      receivedOn: businessDate("2026-04-03"),
      method: "BANK_TRANSFER",
      amount: posted.grandTotal,
      reference: null,
      notes: null,
      journalId: "jr-pay-1",
      allocations: [
        {
          invoiceId: posted.id,
          invoiceNumber: posted.number,
          amount: posted.grandTotal,
        },
      ],
    });

    await expect(
      createCreditNote({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        fields: {
          invoiceId: posted.id,
          issuedOn: businessDate("2026-04-04"),
          lines: [
            { invoiceLineId: posted.lines[0]!.id, quantity: quantityFromMajor("1") },
          ],
        },
        taxContext: taxContext(),
        ...d,
      })
    ).rejects.toBeInstanceOf(CreditNoteValidationError);
  });

  it("snapshots unit cost on invoice lines at post for credit-note COGS", async () => {
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
    expect(posted.lines[0]!.unitCost).toEqual(product.purchasePrice);

    const originalPurchasePrice = product.purchasePrice;
    await d.catalog.updateProduct({
      tenantId: "tenant-a",
      productId: product.id,
      fields: {
        kind: product.kind,
        name: product.name,
        sku: product.sku,
        unitOfMeasurement: product.unitOfMeasurement,
        sellingPrice: product.sellingPrice,
        purchasePrice: money(999_00n),
        hsnSac: product.hsnSac,
        taxRateBps: product.taxRateBps,
        category: product.category,
        tracksInventory: true,
      },
    });

    const creditDraft = await createCreditNote({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        invoiceId: posted.id,
        issuedOn: businessDate("2026-04-05"),
        lines: [
          { invoiceLineId: posted.lines[0]!.id, quantity: quantityFromMajor("1") },
        ],
      },
      taxContext: taxContext(),
      ...d,
    });
    await postCreditNote({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      creditNoteId: creditDraft.id,
      taxContext: taxContext(),
      closedThroughPeriodKey: null,
      accounts,
      journals,
      inventory,
      ...d,
    });
    const creditJournal = journals
      .listPosted()
      .find((journal) => journal.sourceType === "CreditNote");
    const cogsCredit = creditJournal?.lines.find(
      (line) => line.accountCode === ACCOUNT_CODES.COGS && line.credit.amountMinor > 0n
    );
    expect(cogsCredit?.credit.amountMinor).toBe(originalPurchasePrice.amountMinor);
  });

  it("keeps credit notes tenant-scoped", async () => {
    const d = deps();
    const other = createMemorySalesRepository();
    const customer = await seedCustomer(d.parties);
    const product = await seedProduct(d.catalog);
    const draft = await createInvoice({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: invoiceFields(customer.id, product.id),
      taxContext: taxContext(),
      ...d,
    });
    const found = await other.findCreditNoteById("tenant-b", draft.id);
    expect(found).toBeNull();
  });
});
