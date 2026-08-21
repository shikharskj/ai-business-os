import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCOUNT_CODES,
  createMemoryAccountRepository,
  createMemoryJournalRepository,
  ensureChartOfAccounts,
  postJournal,
} from "@/modules/accounting";
import {
  CASH_POSITION_ACCOUNT_CODES,
  CASH_POSITION_FACT_IDS,
} from "@/modules/accounting/domain/cash-accounts";
import {
  BUSINESS_STATE_CONSUMER_NAME,
  computeCashPosition,
  createBusinessStateOutboxConsumer,
  createMemoryBusinessStateProjectionRepository,
  getBusinessStateSummary,
  getCashPosition,
  projectionFamiliesForEvent,
  rebuildBusinessStateProjections,
} from "@/modules/business-state";
import { cashPositionToDto } from "@/modules/business-state/application/dto";
import { createMemoryCatalogRepository } from "@/modules/catalog";
import {
  clearOutboxConsumers,
  createMemoryOutboxDispatchRepository,
  processOutboxConsumers,
  registerOutboxConsumer,
  type OutboxEventRecord,
} from "@/modules/events";
import { createMemoryInventoryRepository } from "@/modules/inventory";
import {
  buildCustomerReceiptJournalLines,
  buildSupplierPaymentJournalLines,
  cashAccountCodeForMethod,
  createMemoryPaymentRepository,
} from "@/modules/payments";
import { createMemorySalesRepository } from "@/modules/sales";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import { executeAiTool } from "@/modules/ai/server";
import { factsFromToolResult } from "@/modules/ai";
import { TENANT_A, toolContext } from "../ai/tool-context-fixture";

const FROZEN_NOW = new Date("2026-08-21T12:00:00.000+05:30");
const zero = money(0n);

async function seededAccounting(tenantId = "tenant-a") {
  const accounts = createMemoryAccountRepository();
  const journals = createMemoryJournalRepository();
  await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
  return { accounts, journals };
}

function invoiceFixture(
  overrides: Partial<SalesInvoice> &
    Pick<SalesInvoice, "id" | "tenantId" | "number" | "status">
): SalesInvoice {
  const taxable = overrides.taxableAmount ?? money(1000_00n);
  const totalTax = overrides.totalTax ?? money(180_00n);
  const grandTotal =
    overrides.grandTotal ?? money(taxable.amountMinor + totalTax.amountMinor);
  return {
    customerId: "cust-1",
    customerName: "Acme",
    quotationId: null,
    journalId: "jr-1",
    dueOn: businessDate("2026-08-01"),
    notes: null,
    placeOfSupplyStateCode: "27",
    subtotal: taxable,
    discountTotal: zero,
    taxableAmount: taxable,
    cgst: money(90_00n),
    sgst: money(90_00n),
    igst: zero,
    totalTax,
    grandTotal,
    supplyType: "INTRA_STATE",
    lines: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    issuedOn: overrides.issuedOn ?? businessDate("2026-08-10"),
    postedAt: overrides.postedAt ?? new Date("2026-08-10T10:00:00.000Z"),
    ...overrides,
  };
}

function outboxEvent(
  partial: Partial<OutboxEventRecord> &
    Pick<OutboxEventRecord, "eventType" | "tenantId" | "aggregateId">
): OutboxEventRecord {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tenantId: partial.tenantId,
    eventType: partial.eventType,
    aggregateType: partial.aggregateType ?? "CustomerPayment",
    aggregateId: partial.aggregateId,
    payload: partial.payload ?? {},
    createdAt: partial.createdAt ?? new Date(),
    processedAt: partial.processedAt ?? null,
  };
}

describe("payment method cash mapping (post-mvp 03)", () => {
  it("maps cash to the Cash account and all other methods to Bank", () => {
    expect(cashAccountCodeForMethod("CASH")).toBe(ACCOUNT_CODES.CASH);
    expect(cashAccountCodeForMethod("UPI")).toBe(ACCOUNT_CODES.BANK);
    expect(cashAccountCodeForMethod("BANK_TRANSFER")).toBe(ACCOUNT_CODES.BANK);
    expect(cashAccountCodeForMethod("CARD")).toBe(ACCOUNT_CODES.BANK);
    expect(cashAccountCodeForMethod("CHEQUE")).toBe(ACCOUNT_CODES.BANK);
    expect(CASH_POSITION_ACCOUNT_CODES).toEqual([
      ACCOUNT_CODES.CASH,
      ACCOUNT_CODES.BANK,
    ]);
  });
});

describe("cash position model (post-mvp 03)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    clearOutboxConsumers();
    vi.useRealTimers();
  });

  it("increases Cash when a customer receipt posts with method CASH", async () => {
    const { accounts, journals } = await seededAccounting();
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "CustomerPayment",
      sourceId: "pay-1",
      lines: buildCustomerReceiptJournalLines({
        paymentNumber: "REC/1",
        method: "CASH",
        amount: money(2360_00n),
      }),
      accountRepository: accounts,
      journalRepository: journals,
    });

    const snapshot = await getCashPosition({
      tenantId: "tenant-a",
      currency: "INR",
      accounts,
      journals,
    });

    expect(toMajorString(snapshot.cashBalance)).toBe("2360.00");
    expect(toMajorString(snapshot.bankBalance)).toBe("0.00");
    expect(toMajorString(snapshot.total)).toBe("2360.00");
    expect(snapshot.currency).toBe("INR");
    expect(snapshot.scale).toBe(2);
  });

  it("increases Bank when a customer receipt posts with a bank method", async () => {
    const { accounts, journals } = await seededAccounting();
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "CustomerPayment",
      sourceId: "pay-2",
      lines: buildCustomerReceiptJournalLines({
        paymentNumber: "REC/2",
        method: "UPI",
        amount: money(500_00n),
      }),
      accountRepository: accounts,
      journalRepository: journals,
    });

    const snapshot = await computeCashPosition({
      tenantId: "tenant-a",
      currency: "INR",
      accounts,
      journals,
    });

    expect(toMajorString(snapshot.cashBalance)).toBe("0.00");
    expect(toMajorString(snapshot.bankBalance)).toBe("500.00");
    expect(toMajorString(snapshot.total)).toBe("500.00");
  });

  it("adds Cash and Bank in the tenant currency when only one account has activity", async () => {
    const { accounts, journals } = await seededAccounting();
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "CustomerPayment",
      sourceId: "pay-usd",
      lines: buildCustomerReceiptJournalLines({
        paymentNumber: "REC/USD",
        method: "CASH",
        amount: money(2360_00n),
      }),
      accountRepository: accounts,
      journalRepository: journals,
    });

    const snapshot = await getCashPosition({
      tenantId: "tenant-a",
      currency: "USD",
      accounts,
      journals,
    });

    expect(snapshot.currency).toBe("USD");
    expect(snapshot.cashBalance.currency).toBe("USD");
    expect(snapshot.bankBalance.currency).toBe("USD");
    expect(snapshot.total.currency).toBe("USD");
    expect(toMajorString(snapshot.cashBalance)).toBe("2360.00");
    expect(toMajorString(snapshot.bankBalance)).toBe("0.00");
    expect(toMajorString(snapshot.total)).toBe("2360.00");

    const rebuilt = await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      currency: "USD",
      lowStockThresholdMajor: "5.0000",
      sales: createMemorySalesRepository(),
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      accounts,
      journals,
      projections: createMemoryBusinessStateProjectionRepository(),
      families: ["cashPosition"],
    });
    expect(rebuilt.cashPosition!.total.currency).toBe("USD");
    expect(toMajorString(rebuilt.cashPosition!.total)).toBe("2360.00");
    expect(toMajorString(rebuilt.cashPosition!.bankBalance)).toBe("0.00");
  });

  it("decreases cash when a supplier payment posts", async () => {
    const { accounts, journals } = await seededAccounting();
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "CustomerPayment",
      sourceId: "pay-in",
      lines: buildCustomerReceiptJournalLines({
        paymentNumber: "REC/1",
        method: "CASH",
        amount: money(1000_00n),
      }),
      accountRepository: accounts,
      journalRepository: journals,
    });
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-11"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "SupplierPayment",
      sourceId: "pay-out",
      lines: buildSupplierPaymentJournalLines({
        paymentNumber: "PAY/1",
        method: "CASH",
        amount: money(250_00n),
      }),
      accountRepository: accounts,
      journalRepository: journals,
    });

    const snapshot = await getCashPosition({
      tenantId: "tenant-a",
      currency: "INR",
      accounts,
      journals,
    });
    expect(toMajorString(snapshot.total)).toBe("750.00");
    expect(toMajorString(snapshot.cashBalance)).toBe("750.00");
  });

  it("does not invent cash from unpaid invoices", async () => {
    const { accounts, journals } = await seededAccounting();
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-open",
          tenantId: "tenant-a",
          number: "INV/1",
          status: "POSTED",
          grandTotal: money(1180_00n),
        }),
      ]
    );
    const projections = createMemoryBusinessStateProjectionRepository();

    const rebuilt = await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      accounts,
      journals,
      projections,
    });

    expect(toMajorString(rebuilt.receivablesRisk!.totalOutstanding)).toBe(
      "1180.00"
    );
    expect(toMajorString(rebuilt.cashPosition!.total)).toBe("0.00");
  });

  it("rebuild reproduces cash from the ledger", async () => {
    const { accounts, journals } = await seededAccounting();
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "CustomerPayment",
      sourceId: "pay-1",
      lines: buildCustomerReceiptJournalLines({
        paymentNumber: "REC/1",
        method: "BANK_TRANSFER",
        amount: money(1500_00n),
      }),
      accountRepository: accounts,
      journalRepository: journals,
    });

    const projections = createMemoryBusinessStateProjectionRepository();
    const rebuilt = await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales: createMemorySalesRepository(),
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      accounts,
      journals,
      projections,
      families: ["cashPosition"],
      markRebuilt: true,
    });

    const live = await getCashPosition({
      tenantId: "tenant-a",
      currency: "INR",
      accounts,
      journals,
    });
    expect(toMajorString(rebuilt.cashPosition!.total)).toBe(
      toMajorString(live.total)
    );
    expect(toMajorString(rebuilt.cashPosition!.bankBalance)).toBe("1500.00");
    expect(projections.cash.get("tenant-a")?.total.amountMinor).toBe(
      1500_00n
    );
  });

  it("outbox PaymentReceived updates CashPosition consistently with ledger", async () => {
    const { accounts, journals } = await seededAccounting();
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "CustomerPayment",
      sourceId: "pay-1",
      lines: buildCustomerReceiptJournalLines({
        paymentNumber: "REC/1",
        method: "CASH",
        amount: money(800_00n),
      }),
      accountRepository: accounts,
      journalRepository: journals,
    });

    const projections = createMemoryBusinessStateProjectionRepository();
    const outbox = createMemoryOutboxDispatchRepository([
      outboxEvent({
        id: "evt-pay",
        tenantId: "tenant-a",
        eventType: "PaymentReceived",
        aggregateId: "pay-1",
      }),
    ]);

    registerOutboxConsumer(
      createBusinessStateOutboxConsumer({
        sales: createMemorySalesRepository(),
        payments: createMemoryPaymentRepository(),
        catalog: createMemoryCatalogRepository(),
        inventory: createMemoryInventoryRepository(),
        accounts,
        journals,
        projections,
        async resolveTenantContext(tenantId) {
          if (tenantId !== "tenant-a") return null;
          return {
            timezone: "Asia/Kolkata",
            currency: "INR",
            lowStockThresholdMajor: "5.0000",
          };
        },
      })
    );

    const result = await processOutboxConsumers({ outbox });
    expect(result.consumers[0]?.consumerName).toBe(BUSINESS_STATE_CONSUMER_NAME);
    expect(result.totalSucceeded).toBe(1);

    const summary = await getBusinessStateSummary({
      tenantId: "tenant-a",
      projections,
    });
    expect(toMajorString(summary.cashPosition!.total)).toBe("800.00");
    expect(toMajorString(summary.cashPosition!.cashBalance)).toBe("800.00");
  });

  it("does not refresh cash on SalesInvoicePosted", () => {
    expect(projectionFamiliesForEvent("SalesInvoicePosted")).not.toContain(
      "cashPosition"
    );
    expect(projectionFamiliesForEvent("PaymentReceived")).toContain(
      "cashPosition"
    );
    expect(projectionFamiliesForEvent("PaymentMade")).toContain("cashPosition");
    expect(projectionFamiliesForEvent("ExpenseRecorded")).toContain(
      "cashPosition"
    );
    expect(projectionFamiliesForEvent("JournalPosted")).toContain(
      "cashPosition"
    );
  });

  it("rejects cross-tenant cash projection reads", async () => {
    const projections = createMemoryBusinessStateProjectionRepository();
    await projections.upsertCashPosition({
      tenantId: "tenant-b",
      cashBalance: money(999_00n),
      bankBalance: money(0n),
      total: money(999_00n),
      currency: "INR",
      scale: 2,
      accounts: [],
      computedAt: new Date(),
    });

    const summary = await getBusinessStateSummary({
      tenantId: "tenant-a",
      projections,
    });
    expect(summary.cashPosition).toBeNull();
  });

  it("DTO cites fact ids with currency and scale", async () => {
    const { accounts, journals } = await seededAccounting();
    const snapshot = await getCashPosition({
      tenantId: "tenant-a",
      currency: "INR",
      accounts,
      journals,
    });
    const dto = cashPositionToDto(snapshot);
    expect(dto.total.factId).toBe(CASH_POSITION_FACT_IDS.total);
    expect(dto.cash.factId).toBe(CASH_POSITION_FACT_IDS.cash);
    expect(dto.bank.factId).toBe(CASH_POSITION_FACT_IDS.bank);
    expect(dto.total.currency).toBe("INR");
    expect(dto.total.scale).toBe(2);
    expect(dto.accounts).toHaveLength(2);
  });
});

describe("get_cash_position AI tool (post-mvp 03)", () => {
  it("reads cash from the ledger query, not invoice outstanding", async () => {
    const context = toolContext();
    await ensureChartOfAccounts({
      tenantId: TENANT_A,
      accountRepository: context.repositories.accounts,
    });
    await postJournal({
      tenantId: TENANT_A,
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "CustomerPayment",
      sourceId: "pay-tool",
      lines: buildCustomerReceiptJournalLines({
        paymentNumber: "REC/T",
        method: "CASH",
        amount: money(321_00n),
      }),
      accountRepository: context.repositories.accounts,
      journalRepository: context.repositories.journals,
    });

    const result = await executeAiTool({
      context,
      toolName: "get_cash_position",
      input: {},
    });

    expect(result.output).toMatchObject({
      total: {
        amountMajor: "321.00",
        currency: "INR",
        scale: 2,
        factId: "cash-position:total",
      },
      cash: { amountMajor: "321.00", factId: "cash-position:cash" },
      bank: { amountMajor: "0.00", factId: "cash-position:bank" },
    });

    const facts = factsFromToolResult({
      toolName: "get_cash_position",
      output: result.output,
    });
    expect(facts.some((fact) => fact.label === "Cash position")).toBe(true);
    expect(facts[0]?.value).toContain("321");
  });
});
