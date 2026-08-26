import { isPositiveQuantity } from "@/modules/inventory/domain/quantity";
import {
  compareQuantity,
  quantity,
  subtractQuantity,
} from "@/modules/inventory/domain/quantity";
import { recordInventoryMovement } from "@/modules/inventory/application/stock";
import { toMajorString, money, compareMoney, type Money } from "@/modules/shared-kernel/money";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import { postJournal } from "@/modules/accounting/application/post-journal";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";
import { CatalogNotFoundError } from "@/modules/catalog/domain/errors";
import type { CatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import { calculateTax } from "@/modules/tax/application/calculate-tax";
import type { HsnSacRepository, TaxRateRepository } from "@/modules/tax/infrastructure/repositories";
import {
  buildCreditNoteJournalLines,
  computeCreditNoteCogsLines,
} from "@/modules/sales/application/build-credit-note-journal";
import type { InvoiceUseCaseDeps, InvoicePostDeps } from "@/modules/sales/application/invoices";
import {
  CreditNoteAlreadyPostedError,
  CreditNoteNotFoundError,
  CreditNoteStatusError,
  CreditNoteValidationError,
  InvoiceNotFoundError,
} from "@/modules/sales/domain/errors";
import {
  assertCreditNoteEditable,
  assertCreditNoteTransition,
  isPostedCreditNoteStatus,
} from "@/modules/sales/domain/credit-note-status";
import {
  assertInvoiceTransition,
  isPostedInvoiceStatus,
} from "@/modules/sales/domain/invoice-status";
import {
  creditNoteFinancialYearKey,
  formatCreditNoteNumber,
} from "@/modules/sales/domain/numbering";
import {
  lineTaxableAmount,
  moneyTimesQuantity,
  proportionMoney,
} from "@/modules/sales/domain/pricing";
import { aggregateQuotationLines } from "@/modules/sales/domain/totals";
import type {
  CreditNote,
  CreditNoteInput,
  CreditNoteListFilter,
  CreditNoteStatus,
  PreparedCreditNote,
  PreparedCreditNoteLine,
  SalesTaxContext,
} from "@/modules/sales/domain/types";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { PaymentRepository } from "@/modules/payments/infrastructure/repositories";
import { nextInvoicePaymentStatus } from "@/modules/payments/domain/status";
import { remainingDocumentBalance } from "@/modules/payments/domain/allocation";

export type CreditNoteUseCaseDeps = InvoiceUseCaseDeps & {
  payments: PaymentRepository;
};

export type CreditNotePostDeps = InvoicePostDeps & {
  payments: PaymentRepository;
};

function moneySnapshot(value: Money) {
  return { amount: toMajorString(value), currency: value.currency };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

async function assertCreditWithinRemainingBalance(input: {
  tenantId: string;
  invoiceId: string;
  invoiceGrandTotal: Money;
  creditGrandTotal: Money;
  sales: SalesRepository;
  payments: PaymentRepository;
}): Promise<void> {
  const allocated =
    (
      await input.payments.allocatedTotalsForInvoices(input.tenantId, [
        input.invoiceId,
      ])
    ).get(input.invoiceId) ?? money(0n, input.invoiceGrandTotal.currency);
  const credited =
    (
      await input.sales.creditedTotalsForInvoices(input.tenantId, [
        input.invoiceId,
      ])
    ).get(input.invoiceId) ?? money(0n, input.invoiceGrandTotal.currency);
  const remaining = remainingDocumentBalance(
    input.invoiceGrandTotal,
    allocated,
    credited
  );
  if (compareMoney(input.creditGrandTotal, remaining) > 0) {
    throw new CreditNoteValidationError(
      "Credit note total cannot exceed the invoice remaining balance."
    );
  }
}

async function prepareCreditNote(input: {
  tenantId: string;
  fields: CreditNoteInput;
  taxContext: SalesTaxContext;
  sales: SalesRepository;
  parties: PartyRepository;
  catalog: CatalogRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
  payments: PaymentRepository;
  excludeCreditNoteId?: string;
}): Promise<PreparedCreditNote> {
  if (input.fields.lines.length === 0) {
    throw new CreditNoteValidationError("Add at least one line to credit.");
  }

  const invoice = await input.sales.findInvoiceById(
    input.tenantId,
    input.fields.invoiceId
  );
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }
  if (!isPostedInvoiceStatus(invoice.status)) {
    throw new CreditNoteValidationError(
      "Credit notes can only be issued against a posted invoice."
    );
  }

  const customer = await input.parties.findCustomerById(
    input.tenantId,
    invoice.customerId
  );

  const creditedByLine = await input.sales.creditedQuantityByInvoiceLine({
    tenantId: input.tenantId,
    invoiceId: invoice.id,
    excludeCreditNoteId: input.excludeCreditNoteId,
  });

  const seen = new Set<string>();
  const currency = input.taxContext.currency;
  const lines: PreparedCreditNoteLine[] = [];

  for (const [index, lineInput] of input.fields.lines.entries()) {
    if (seen.has(lineInput.invoiceLineId)) {
      throw new CreditNoteValidationError(
        "Each invoice line can appear only once on a credit note."
      );
    }
    seen.add(lineInput.invoiceLineId);

    if (!isPositiveQuantity(lineInput.quantity)) {
      throw new CreditNoteValidationError("Each line quantity must be greater than zero.");
    }

    const invoiceLine = invoice.lines.find((line) => line.id === lineInput.invoiceLineId);
    if (!invoiceLine) {
      throw new CreditNoteValidationError(
        "A credit note line must belong to the selected invoice."
      );
    }

    const alreadyCredited =
      creditedByLine.get(invoiceLine.id) ?? quantity(0n);
    const remaining = subtractQuantity(invoiceLine.quantity, alreadyCredited);
    if (compareQuantity(lineInput.quantity, remaining) > 0) {
      throw new CreditNoteValidationError(
        `Cannot credit more than the remaining quantity on ${invoiceLine.productName}.`
      );
    }

    const product = await input.catalog.findProductById(
      input.tenantId,
      invoiceLine.productId
    );
    if (!product) {
      throw new CatalogNotFoundError();
    }

    const unitPrice = invoiceLine.unitPrice;
    const discount = proportionMoney(
      invoiceLine.discount,
      lineInput.quantity,
      invoiceLine.quantity
    );
    const lineSubtotal = moneyTimesQuantity(unitPrice, lineInput.quantity);
    const taxableAmount = lineTaxableAmount(lineSubtotal, discount);
    const gst = await calculateTax({
      tenantId: input.tenantId,
      businessGstin: input.taxContext.gstin,
      businessGstRegistrationStatus: input.taxContext.gstRegistrationStatus,
      businessStateName: input.taxContext.stateName,
      counterpartyGstin: customer?.gstin ?? null,
      placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
      transactionType: "SALE",
      hsnSac: invoiceLine.hsnSac,
      taxableAmount,
      taxRateBps: invoiceLine.taxRateBps,
      defaultGstRateBps: input.taxContext.defaultGstRateBps,
      transactionDate: input.fields.issuedOn,
      taxRateRepository: input.taxRates,
      hsnSacRepository: input.hsnSac,
    });

    lines.push({
      sortOrder: index,
      sourceInvoiceLineId: invoiceLine.id,
      productId: invoiceLine.productId,
      productName: invoiceLine.productName,
      sku: invoiceLine.sku,
      unitOfMeasurement: invoiceLine.unitOfMeasurement,
      hsnSac: invoiceLine.hsnSac,
      taxRateBps: gst.taxRateBps,
      quantity: lineInput.quantity,
      unitPrice,
      discount,
      lineSubtotal,
      taxableAmount,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      totalTax: gst.totalTax,
      lineTotal: gst.grandTotal,
      supplyType: gst.supplyType,
      treatment: gst.treatment,
    });
  }

  const totals = aggregateQuotationLines(lines, currency);
  const notes = input.fields.notes?.trim() ? input.fields.notes.trim() : null;

  await assertCreditWithinRemainingBalance({
    tenantId: input.tenantId,
    invoiceId: invoice.id,
    invoiceGrandTotal: invoice.grandTotal,
    creditGrandTotal: totals.grandTotal,
    sales: input.sales,
    payments: input.payments,
  });

  return {
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    issuedOn: input.fields.issuedOn,
    notes,
    placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
    ...totals,
    lines,
  };
}

export async function previewCreditNote(input: {
  tenantId: string;
  fields: CreditNoteInput;
  taxContext: SalesTaxContext;
  excludeCreditNoteId?: string;
} & Pick<
  CreditNoteUseCaseDeps,
  "sales" | "parties" | "catalog" | "taxRates" | "hsnSac" | "payments"
>): Promise<PreparedCreditNote> {
  return prepareCreditNote(input);
}

export async function createCreditNote(input: {
  tenantId: string;
  actorUserId: string;
  fields: CreditNoteInput;
  taxContext: SalesTaxContext;
} & CreditNoteUseCaseDeps): Promise<CreditNote> {
  const prepared = await prepareCreditNote(input);
  const financialYearKey = creditNoteFinancialYearKey(
    prepared.issuedOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.sales.allocateNextCreditNoteNumber(
    input.tenantId,
    financialYearKey
  );
  const creditNote = await input.sales.createCreditNote({
    tenantId: input.tenantId,
    number: formatCreditNoteNumber(financialYearKey, sequence),
    prepared,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "credit_note.created",
    resource: "credit_note",
    resourceId: creditNote.id,
    metadata: {
      number: creditNote.number,
      invoiceId: creditNote.invoiceId,
      grandTotal: moneySnapshot(creditNote.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "CreditNoteCreated",
    aggregateType: "CreditNote",
    aggregateId: creditNote.id,
    payload: {
      number: creditNote.number,
      status: creditNote.status,
      invoiceId: creditNote.invoiceId,
    },
  });

  return creditNote;
}

export async function updateCreditNote(input: {
  tenantId: string;
  actorUserId: string;
  creditNoteId: string;
  fields: CreditNoteInput;
  taxContext: SalesTaxContext;
} & CreditNoteUseCaseDeps): Promise<CreditNote> {
  const existing = await input.sales.findCreditNoteById(
    input.tenantId,
    input.creditNoteId
  );
  if (!existing) {
    throw new CreditNoteNotFoundError();
  }
  assertCreditNoteEditable(existing.status);

  const prepared = await prepareCreditNote({
    ...input,
    excludeCreditNoteId: existing.id,
  });
  const creditNote = await input.sales.updateCreditNote({
    tenantId: input.tenantId,
    creditNoteId: existing.id,
    prepared,
  });
  if (!creditNote) {
    throw new CreditNoteNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "credit_note.updated",
    resource: "credit_note",
    resourceId: creditNote.id,
    metadata: {
      number: creditNote.number,
      grandTotal: moneySnapshot(creditNote.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "CreditNoteUpdated",
    aggregateType: "CreditNote",
    aggregateId: creditNote.id,
    payload: { number: creditNote.number, status: creditNote.status },
  });

  return creditNote;
}

export async function getCreditNote(input: {
  tenantId: string;
  creditNoteId: string;
  sales: SalesRepository;
}): Promise<CreditNote> {
  const creditNote = await input.sales.findCreditNoteById(
    input.tenantId,
    input.creditNoteId
  );
  if (!creditNote) {
    throw new CreditNoteNotFoundError();
  }
  return creditNote;
}

export async function listCreditNotesPage(input: {
  tenantId: string;
  query?: string;
  status?: CreditNoteStatus | "ALL";
  customerId?: string;
  invoiceId?: string;
  fromDate?: CreditNoteListFilter["fromDate"];
  toDate?: CreditNoteListFilter["toDate"];
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  sales: SalesRepository;
}) {
  return input.sales.listCreditNotesPage({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    customerId: input.customerId,
    invoiceId: input.invoiceId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listCreditNotes(input: {
  tenantId: string;
  query?: string;
  status?: CreditNoteStatus | "ALL";
  customerId?: string;
  invoiceId?: string;
  statuses?: readonly CreditNoteStatus[];
  fromDate?: CreditNoteListFilter["fromDate"];
  toDate?: CreditNoteListFilter["toDate"];
  sales: SalesRepository;
}): Promise<CreditNote[]> {
  return input.sales.listCreditNotes({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    customerId: input.customerId,
    invoiceId: input.invoiceId,
    statuses: input.statuses,
    fromDate: input.fromDate,
    toDate: input.toDate,
  });
}

export async function postCreditNote(input: {
  tenantId: string;
  actorUserId: string;
  creditNoteId: string;
  taxContext: SalesTaxContext;
  closedThroughPeriodKey: string | null;
} & CreditNotePostDeps): Promise<CreditNote> {
  const existing = await input.sales.lockCreditNoteForUpdate(
    input.tenantId,
    input.creditNoteId
  );
  if (!existing) {
    throw new CreditNoteNotFoundError();
  }
  if (isPostedCreditNoteStatus(existing.status)) {
    throw new CreditNoteAlreadyPostedError();
  }
  if (existing.status !== "DRAFT") {
    throw new CreditNoteStatusError(
      `A ${existing.status.toLowerCase()} credit note cannot be posted.`
    );
  }

  const invoice = await input.sales.lockInvoiceForUpdate(
    input.tenantId,
    existing.invoiceId
  );
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }
  if (!isPostedInvoiceStatus(invoice.status)) {
    throw new CreditNoteValidationError(
      "Credit notes can only be posted against a posted invoice."
    );
  }

  await assertCreditWithinRemainingBalance({
    tenantId: input.tenantId,
    invoiceId: invoice.id,
    invoiceGrandTotal: invoice.grandTotal,
    creditGrandTotal: existing.grandTotal,
    sales: input.sales,
    payments: input.payments,
  });

  const creditedByLine = await input.sales.creditedQuantityByInvoiceLine({
    tenantId: input.tenantId,
    invoiceId: invoice.id,
    excludeCreditNoteId: existing.id,
  });

  for (const line of existing.lines) {
    const invoiceLine = invoice.lines.find((il) => il.id === line.sourceInvoiceLineId);
    if (!invoiceLine) {
      throw new CreditNoteValidationError(
        "A credit note line must belong to the selected invoice."
      );
    }
    const alreadyCredited = creditedByLine.get(invoiceLine.id) ?? quantity(0n);
    const remaining = subtractQuantity(invoiceLine.quantity, alreadyCredited);
    if (compareQuantity(line.quantity, remaining) > 0) {
      throw new CreditNoteValidationError(
        `Cannot credit more than the remaining quantity on ${invoiceLine.productName}.`
      );
    }
  }

  await ensureChartOfAccounts({
    tenantId: input.tenantId,
    accountRepository: input.accounts,
  });

  const productMap = new Map(
    (
      await Promise.all(
        existing.lines.map((line) =>
          input.catalog.findProductById(input.tenantId, line.productId)
        )
      )
    )
      .filter((product): product is NonNullable<typeof product> => product !== null)
      .map((product) => [product.id, product] as const)
  );

  for (const line of existing.lines) {
    if (!productMap.has(line.productId)) {
      throw new CatalogNotFoundError();
    }
  }

  const invoiceLineMap = new Map(
    invoice.lines.map((line) => [line.id, line] as const)
  );
  const cogsLines = computeCreditNoteCogsLines(
    existing,
    invoiceLineMap,
    productMap
  );
  const journalLines = buildCreditNoteJournalLines(existing, cogsLines);

  for (const line of existing.lines) {
    const product = productMap.get(line.productId)!;
    if (!product.tracksInventory) {
      continue;
    }
    await recordInventoryMovement({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      catalog: input.catalog,
      inventory: input.inventory,
      audit: input.audit,
      outbox: input.outbox,
      movement: {
        productId: line.productId,
        cause: "RETURN",
        direction: "IN",
        quantity: line.quantity,
        occurredOn: existing.issuedOn,
        sourceType: "CreditNote",
        sourceId: existing.id,
        idempotencyKey: `credit-note:${existing.id}:${line.id}`,
        reason: `Credit note ${existing.number}`,
      },
    });
  }

  let journal;
  try {
    journal = await postJournal({
      tenantId: input.tenantId,
      accountingDate: existing.issuedOn,
      financialYearStartMonth: input.taxContext.financialYearStartMonth,
      closedThroughPeriodKey: input.closedThroughPeriodKey,
      sourceType: "CreditNote",
      sourceId: existing.id,
      memo: `Credit note ${existing.number}`,
      lines: journalLines,
      accountRepository: input.accounts,
      journalRepository: input.journals,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CreditNoteAlreadyPostedError();
    }
    throw error;
  }

  const creditNote = await input.sales.markCreditNotePosted({
    tenantId: input.tenantId,
    creditNoteId: existing.id,
    journalId: journal.id,
    postedAt: journal.postedAt,
    status: "POSTED",
    expectedStatus: "DRAFT",
  });
  if (!creditNote) {
    throw new CreditNoteStatusError(
      "Credit note was modified or posted by another operation. Please refresh and try again."
    );
  }

  const allocated =
    (
      await input.payments.allocatedTotalsForInvoices(input.tenantId, [invoice.id])
    ).get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
  const credited =
    (
      await input.sales.creditedTotalsForInvoices(input.tenantId, [invoice.id])
    ).get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
  const outstanding = remainingDocumentBalance(
    invoice.grandTotal,
    allocated,
    credited
  );
  const nextStatus = nextInvoicePaymentStatus({
    currentStatus: invoice.status,
    grandTotal: invoice.grandTotal,
    outstanding,
  });
  if (nextStatus !== invoice.status) {
    assertInvoiceTransition(invoice.status, nextStatus);
    const updatedInvoice = await input.sales.updateInvoiceStatus({
      tenantId: input.tenantId,
      invoiceId: invoice.id,
      status: nextStatus,
    });
    if (!updatedInvoice) {
      throw new InvoiceNotFoundError();
    }
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "credit_note.posted",
    resource: "credit_note",
    resourceId: creditNote.id,
    metadata: {
      number: creditNote.number,
      invoiceId: creditNote.invoiceId,
      journalId: journal.id,
      grandTotal: moneySnapshot(creditNote.grandTotal),
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "CreditNotePosted",
    aggregateType: "CreditNote",
    aggregateId: creditNote.id,
    payload: {
      number: creditNote.number,
      status: creditNote.status,
      invoiceId: creditNote.invoiceId,
      journalId: journal.id,
    },
  });

  return creditNote;
}

export async function cancelCreditNote(input: {
  tenantId: string;
  actorUserId: string;
  creditNoteId: string;
} & Pick<CreditNoteUseCaseDeps, "sales" | "audit" | "outbox">): Promise<CreditNote> {
  const existing = await input.sales.findCreditNoteById(
    input.tenantId,
    input.creditNoteId
  );
  if (!existing) {
    throw new CreditNoteNotFoundError();
  }
  assertCreditNoteTransition(existing.status, "CANCELLED");

  const creditNote = await input.sales.updateCreditNoteStatus({
    tenantId: input.tenantId,
    creditNoteId: input.creditNoteId,
    status: "CANCELLED",
  });
  if (!creditNote) {
    throw new CreditNoteNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "credit_note.cancelled",
    resource: "credit_note",
    resourceId: creditNote.id,
    metadata: { number: creditNote.number, from: existing.status },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "CreditNoteCancelled",
    aggregateType: "CreditNote",
    aggregateId: creditNote.id,
    payload: { number: creditNote.number, status: creditNote.status },
  });

  return creditNote;
}
