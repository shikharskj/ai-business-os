import type {
  CreditNote,
  CreditNoteListFilter,
  CreditNoteStatus,
  InvoiceListFilter,
  PreparedCreditNote,
  PreparedInvoice,
  PreparedQuotation,
  PreparedSalesOrder,
  Quotation,
  QuotationListFilter,
  SalesInvoice,
  SalesInvoiceStatus,
  SalesOrder,
  SalesOrderListFilter,
  SalesOrderStatus,
} from "@/modules/sales/domain/types";
import type { QuotationStatus } from "@/modules/sales/domain/types";
import type { ListPageParams, ListPageResult } from "@/modules/shared-kernel/list-page";
import { paginateArray } from "@/modules/shared-kernel/list-page";
import { isInvoiceOverdue } from "@/modules/sales/domain/invoice-status";
import { ACTIVE_CREDIT_NOTE_STATUSES } from "@/modules/sales/domain/credit-note-status";
import type { PaymentRepository } from "@/modules/payments/infrastructure/repositories";
import { addMoney, money, type Money } from "@/modules/shared-kernel/money";
import {
  addQuantity,
  quantity,
  type Quantity,
} from "@/modules/inventory/domain/quantity";

export type CreateQuotationRecordInput = {
  tenantId: string;
  number: string;
  prepared: PreparedQuotation;
};

export type UpdateQuotationRecordInput = {
  tenantId: string;
  quotationId: string;
  prepared: PreparedQuotation;
};

export type CreateInvoiceRecordInput = {
  tenantId: string;
  number: string;
  prepared: PreparedInvoice;
  quotationId?: string | null;
  salesOrderId?: string | null;
};

export type UpdateInvoiceRecordInput = {
  tenantId: string;
  invoiceId: string;
  prepared: PreparedInvoice;
};

export type CreateSalesOrderRecordInput = {
  tenantId: string;
  number: string;
  prepared: PreparedSalesOrder;
  status?: SalesOrderStatus;
};

export type UpdateSalesOrderRecordInput = {
  tenantId: string;
  salesOrderId: string;
  prepared: PreparedSalesOrder;
};

export type CreateCreditNoteRecordInput = {
  tenantId: string;
  number: string;
  prepared: PreparedCreditNote;
};

export type UpdateCreditNoteRecordInput = {
  tenantId: string;
  creditNoteId: string;
  prepared: PreparedCreditNote;
};

export type SalesRepository = {
  allocateNextQuotationNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createQuotation(input: CreateQuotationRecordInput): Promise<Quotation>;
  updateQuotation(input: UpdateQuotationRecordInput): Promise<Quotation | null>;
  updateQuotationStatus(input: {
    tenantId: string;
    quotationId: string;
    status: QuotationStatus;
  }): Promise<Quotation | null>;
  findQuotationById(tenantId: string, quotationId: string): Promise<Quotation | null>;
  listQuotations(filter: QuotationListFilter): Promise<Quotation[]>;
  listQuotationsPage(
    filter: QuotationListFilter & ListPageParams
  ): Promise<ListPageResult<Quotation>>;
  allocateNextInvoiceNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createInvoice(input: CreateInvoiceRecordInput): Promise<SalesInvoice>;
  updateInvoice(input: UpdateInvoiceRecordInput): Promise<SalesInvoice | null>;
  markInvoicePosted(input: {
    tenantId: string;
    invoiceId: string;
    journalId: string;
    postedAt: Date;
    status: SalesInvoiceStatus;
    expectedStatus: SalesInvoiceStatus;
  }): Promise<SalesInvoice | null>;
  updateInvoiceStatus(input: {
    tenantId: string;
    invoiceId: string;
    status: SalesInvoiceStatus;
  }): Promise<SalesInvoice | null>;
  setInvoiceLineUnitCosts(input: {
    tenantId: string;
    invoiceId: string;
    costs: Array<{ lineId: string; unitCost: Money }>;
  }): Promise<SalesInvoice | null>;
  lockInvoiceForUpdate(
    tenantId: string,
    invoiceId: string
  ): Promise<SalesInvoice | null>;
  lockCreditNoteForUpdate(
    tenantId: string,
    creditNoteId: string
  ): Promise<CreditNote | null>;
  findInvoiceById(tenantId: string, invoiceId: string): Promise<SalesInvoice | null>;
  findInvoiceByQuotationId(
    tenantId: string,
    quotationId: string
  ): Promise<SalesInvoice | null>;
  findInvoiceBySalesOrderId(
    tenantId: string,
    salesOrderId: string
  ): Promise<SalesInvoice | null>;
  listInvoices(filter: InvoiceListFilter): Promise<SalesInvoice[]>;
  listInvoicesPage(
    filter: InvoiceListFilter & ListPageParams
  ): Promise<ListPageResult<SalesInvoice>>;
  allocateNextSalesOrderNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createSalesOrder(input: CreateSalesOrderRecordInput): Promise<SalesOrder>;
  updateSalesOrder(input: UpdateSalesOrderRecordInput): Promise<SalesOrder | null>;
  updateSalesOrderStatus(input: {
    tenantId: string;
    salesOrderId: string;
    status: SalesOrderStatus;
  }): Promise<SalesOrder | null>;
  findSalesOrderById(tenantId: string, salesOrderId: string): Promise<SalesOrder | null>;
  findSalesOrderByQuotationId(
    tenantId: string,
    quotationId: string
  ): Promise<SalesOrder | null>;
  listSalesOrders(filter: SalesOrderListFilter): Promise<SalesOrder[]>;
  listSalesOrdersPage(
    filter: SalesOrderListFilter & ListPageParams
  ): Promise<ListPageResult<SalesOrder>>;
  allocateNextCreditNoteNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createCreditNote(input: CreateCreditNoteRecordInput): Promise<CreditNote>;
  updateCreditNote(input: UpdateCreditNoteRecordInput): Promise<CreditNote | null>;
  markCreditNotePosted(input: {
    tenantId: string;
    creditNoteId: string;
    journalId: string;
    postedAt: Date;
    status: CreditNoteStatus;
    expectedStatus: CreditNoteStatus;
  }): Promise<CreditNote | null>;
  updateCreditNoteStatus(input: {
    tenantId: string;
    creditNoteId: string;
    status: CreditNoteStatus;
  }): Promise<CreditNote | null>;
  findCreditNoteById(
    tenantId: string,
    creditNoteId: string
  ): Promise<CreditNote | null>;
  listCreditNotes(filter: CreditNoteListFilter): Promise<CreditNote[]>;
  listCreditNotesPage(
    filter: CreditNoteListFilter & ListPageParams
  ): Promise<ListPageResult<CreditNote>>;
  creditedTotalsForInvoices(
    tenantId: string,
    invoiceIds: readonly string[]
  ): Promise<Map<string, import("@/modules/shared-kernel/money").Money>>;
  creditedQuantityByInvoiceLine(input: {
    tenantId: string;
    invoiceId: string;
    excludeCreditNoteId?: string;
  }): Promise<Map<string, Quantity>>;
};

function cloneQuotation(quotation: Quotation): Quotation {
  return {
    ...quotation,
    lines: quotation.lines.map((line) => ({ ...line })),
  };
}

function cloneInvoice(invoice: SalesInvoice): SalesInvoice {
  return {
    ...invoice,
    postedAt: invoice.postedAt ? new Date(invoice.postedAt.getTime()) : null,
    lines: invoice.lines.map((line) => ({ ...line })),
  };
}

function withQuotationLineIds(
  tenantId: string,
  quotationId: string,
  prepared: PreparedQuotation
): Quotation["lines"] {
  return prepared.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    tenantId,
    quotationId,
  }));
}

function cloneSalesOrder(salesOrder: SalesOrder): SalesOrder {
  return {
    ...salesOrder,
    lines: salesOrder.lines.map((line) => ({ ...line })),
  };
}

function withSalesOrderLineIds(
  tenantId: string,
  salesOrderId: string,
  prepared: PreparedSalesOrder
): SalesOrder["lines"] {
  return prepared.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    tenantId,
    salesOrderId,
  }));
}

function withInvoiceLineIds(
  tenantId: string,
  invoiceId: string,
  prepared: PreparedInvoice
): SalesInvoice["lines"] {
  return prepared.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    tenantId,
    invoiceId,
    unitCost: null,
  }));
}

function cloneCreditNote(creditNote: CreditNote): CreditNote {
  return {
    ...creditNote,
    postedAt: creditNote.postedAt ? new Date(creditNote.postedAt.getTime()) : null,
    lines: creditNote.lines.map((line) => ({ ...line })),
  };
}

function withCreditNoteLineIds(
  tenantId: string,
  creditNoteId: string,
  prepared: PreparedCreditNote
): CreditNote["lines"] {
  return prepared.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    tenantId,
    creditNoteId,
  }));
}

export function createMemorySalesRepository(
  initial: Quotation[] = [],
  initialInvoices: SalesInvoice[] = [],
  options?: {
    payments?: Pick<PaymentRepository, "allocatedTotalsForInvoices">;
  }
): SalesRepository & {
  records: Quotation[];
  invoices: SalesInvoice[];
  creditNotes: CreditNote[];
  series: Map<string, number>;
  invoiceSeries: Map<string, number>;
  salesOrderSeries: Map<string, number>;
  creditNoteSeries: Map<string, number>;
} {
  const records = initial.map(cloneQuotation);
  const invoices = initialInvoices.map(cloneInvoice);
  const salesOrders: SalesOrder[] = [];
  const creditNotes: CreditNote[] = [];
  const series = new Map<string, number>();
  const invoiceSeries = new Map<string, number>();
  const salesOrderSeries = new Map<string, number>();
  const creditNoteSeries = new Map<string, number>();

  function findIndex(tenantId: string, quotationId: string) {
    return records.findIndex(
      (record) => record.tenantId === tenantId && record.id === quotationId
    );
  }

  return {
    records,
    invoices,
    creditNotes,
    series,
    invoiceSeries,
    salesOrderSeries,
    creditNoteSeries,
    async allocateNextQuotationNumber(tenantId, financialYearKey) {
      const key = `${tenantId}:${financialYearKey}`;
      const next = (series.get(key) ?? 0) + 1;
      series.set(key, next);
      return next;
    },
    async createQuotation(input) {
      const now = new Date();
      const id = crypto.randomUUID();
      const quotation: Quotation = {
        id,
        tenantId: input.tenantId,
        number: input.number,
        customerId: input.prepared.customerId,
        customerName: input.prepared.customerName,
        status: "DRAFT",
        issuedOn: input.prepared.issuedOn,
        validUntil: input.prepared.validUntil,
        notes: input.prepared.notes,
        placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
        subtotal: input.prepared.subtotal,
        discountTotal: input.prepared.discountTotal,
        taxableAmount: input.prepared.taxableAmount,
        cgst: input.prepared.cgst,
        sgst: input.prepared.sgst,
        igst: input.prepared.igst,
        totalTax: input.prepared.totalTax,
        grandTotal: input.prepared.grandTotal,
        supplyType: input.prepared.supplyType,
        lines: withQuotationLineIds(input.tenantId, id, input.prepared),
        createdAt: now,
        updatedAt: now,
      };
      records.push(quotation);
      return cloneQuotation(quotation);
    },
    async updateQuotation(input) {
      const index = findIndex(input.tenantId, input.quotationId);
      if (index === -1) {
        return null;
      }
      const current = records[index]!;
      const updated: Quotation = {
        ...current,
        customerId: input.prepared.customerId,
        customerName: input.prepared.customerName,
        issuedOn: input.prepared.issuedOn,
        validUntil: input.prepared.validUntil,
        notes: input.prepared.notes,
        placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
        subtotal: input.prepared.subtotal,
        discountTotal: input.prepared.discountTotal,
        taxableAmount: input.prepared.taxableAmount,
        cgst: input.prepared.cgst,
        sgst: input.prepared.sgst,
        igst: input.prepared.igst,
        totalTax: input.prepared.totalTax,
        grandTotal: input.prepared.grandTotal,
        supplyType: input.prepared.supplyType,
        lines: withQuotationLineIds(input.tenantId, current.id, input.prepared),
        updatedAt: new Date(),
      };
      records[index] = updated;
      return cloneQuotation(updated);
    },
    async updateQuotationStatus(input) {
      const index = findIndex(input.tenantId, input.quotationId);
      if (index === -1) {
        return null;
      }
      const updated: Quotation = {
        ...records[index]!,
        status: input.status,
        updatedAt: new Date(),
      };
      records[index] = updated;
      return cloneQuotation(updated);
    },
    async findQuotationById(tenantId, quotationId) {
      const record = records.find(
        (item) => item.tenantId === tenantId && item.id === quotationId
      );
      return record ? cloneQuotation(record) : null;
    },
    async listQuotations(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      return records
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.customerId && record.customerId !== filter.customerId) {
            return false;
          }
          if (!filter.status || filter.status === "ALL") {
            return true;
          }
          return record.status === filter.status;
        })
        .filter((record) => {
          if (filter.fromDate && record.issuedOn < filter.fromDate) return false;
          if (filter.toDate && record.issuedOn > filter.toDate) return false;
          return true;
        })
        .filter((record) => {
          if (!query) {
            return true;
          }
          return [record.number, record.customerName]
            .some((value) => value.toLowerCase().includes(query));
        })
        .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number))
        .map(cloneQuotation);
    },
    async listQuotationsPage(filter) {
      return paginateArray(await this.listQuotations(filter), filter.page, filter.pageSize);
    },
    async allocateNextSalesOrderNumber(tenantId, financialYearKey) {
      const key = `${tenantId}:${financialYearKey}`;
      const next = (salesOrderSeries.get(key) ?? 0) + 1;
      salesOrderSeries.set(key, next);
      return next;
    },
    async createSalesOrder(input) {
      const now = new Date();
      const id = crypto.randomUUID();
      const salesOrder: SalesOrder = {
        id,
        tenantId: input.tenantId,
        number: input.number,
        customerId: input.prepared.customerId,
        customerName: input.prepared.customerName,
        status: input.status ?? "DRAFT",
        quotationId: input.prepared.quotationId,
        issuedOn: input.prepared.issuedOn,
        expectedOn: input.prepared.expectedOn,
        notes: input.prepared.notes,
        placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
        subtotal: input.prepared.subtotal,
        discountTotal: input.prepared.discountTotal,
        taxableAmount: input.prepared.taxableAmount,
        cgst: input.prepared.cgst,
        sgst: input.prepared.sgst,
        igst: input.prepared.igst,
        totalTax: input.prepared.totalTax,
        grandTotal: input.prepared.grandTotal,
        supplyType: input.prepared.supplyType,
        lines: withSalesOrderLineIds(input.tenantId, id, input.prepared),
        createdAt: now,
        updatedAt: now,
      };
      salesOrders.push(salesOrder);
      return cloneSalesOrder(salesOrder);
    },
    async updateSalesOrder(input) {
      const index = salesOrders.findIndex(
        (record) => record.tenantId === input.tenantId && record.id === input.salesOrderId
      );
      if (index === -1) {
        return null;
      }
      const current = salesOrders[index]!;
      const updated: SalesOrder = {
        ...current,
        customerId: input.prepared.customerId,
        customerName: input.prepared.customerName,
        quotationId: input.prepared.quotationId,
        issuedOn: input.prepared.issuedOn,
        expectedOn: input.prepared.expectedOn,
        notes: input.prepared.notes,
        placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
        subtotal: input.prepared.subtotal,
        discountTotal: input.prepared.discountTotal,
        taxableAmount: input.prepared.taxableAmount,
        cgst: input.prepared.cgst,
        sgst: input.prepared.sgst,
        igst: input.prepared.igst,
        totalTax: input.prepared.totalTax,
        grandTotal: input.prepared.grandTotal,
        supplyType: input.prepared.supplyType,
        lines: withSalesOrderLineIds(input.tenantId, current.id, input.prepared),
        updatedAt: new Date(),
      };
      salesOrders[index] = updated;
      return cloneSalesOrder(updated);
    },
    async updateSalesOrderStatus(input) {
      const index = salesOrders.findIndex(
        (record) => record.tenantId === input.tenantId && record.id === input.salesOrderId
      );
      if (index === -1) {
        return null;
      }
      const current = salesOrders[index]!;
      const updated: SalesOrder = {
        ...current,
        status: input.status,
        updatedAt: new Date(),
      };
      salesOrders[index] = updated;
      return cloneSalesOrder(updated);
    },
    async findSalesOrderById(tenantId, salesOrderId) {
      const record = salesOrders.find(
        (item) => item.tenantId === tenantId && item.id === salesOrderId
      );
      return record ? cloneSalesOrder(record) : null;
    },
    async findSalesOrderByQuotationId(tenantId, quotationId) {
      const record = salesOrders.find(
        (item) => item.tenantId === tenantId && item.quotationId === quotationId
      );
      return record ? cloneSalesOrder(record) : null;
    },
    async listSalesOrders(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      return salesOrders
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.customerId && record.customerId !== filter.customerId) {
            return false;
          }
          if (!filter.status || filter.status === "ALL") {
            return true;
          }
          return record.status === filter.status;
        })
        .filter((record) => {
          if (filter.fromDate && record.issuedOn < filter.fromDate) return false;
          if (filter.toDate && record.issuedOn > filter.toDate) return false;
          return true;
        })
        .filter((record) => {
          if (!query) {
            return true;
          }
          return [record.number, record.customerName].some((value) =>
            value.toLowerCase().includes(query)
          );
        })
        .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number))
        .map(cloneSalesOrder);
    },
    async listSalesOrdersPage(filter) {
      return paginateArray(await this.listSalesOrders(filter), filter.page, filter.pageSize);
    },
    async allocateNextInvoiceNumber(tenantId, financialYearKey) {
      const key = `${tenantId}:${financialYearKey}`;
      const next = (invoiceSeries.get(key) ?? 0) + 1;
      invoiceSeries.set(key, next);
      return next;
    },
    async createInvoice(input) {
      const now = new Date();
      const id = crypto.randomUUID();
      const invoice: SalesInvoice = {
        id,
        tenantId: input.tenantId,
        number: input.number,
        customerId: input.prepared.customerId,
        customerName: input.prepared.customerName,
        status: "DRAFT",
        quotationId: input.quotationId ?? null,
        salesOrderId: input.salesOrderId ?? null,
        journalId: null,
        issuedOn: input.prepared.issuedOn,
        dueOn: input.prepared.dueOn,
        notes: input.prepared.notes,
        placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
        subtotal: input.prepared.subtotal,
        discountTotal: input.prepared.discountTotal,
        taxableAmount: input.prepared.taxableAmount,
        cgst: input.prepared.cgst,
        sgst: input.prepared.sgst,
        igst: input.prepared.igst,
        totalTax: input.prepared.totalTax,
        grandTotal: input.prepared.grandTotal,
        supplyType: input.prepared.supplyType,
        postedAt: null,
        lines: withInvoiceLineIds(input.tenantId, id, input.prepared),
        createdAt: now,
        updatedAt: now,
      };
      invoices.push(invoice);
      return cloneInvoice(invoice);
    },
    async updateInvoice(input) {
      const index = invoices.findIndex(
        (record) => record.tenantId === input.tenantId && record.id === input.invoiceId
      );
      if (index === -1) {
        return null;
      }
      const current = invoices[index]!;
      const updated: SalesInvoice = {
        ...current,
        customerId: input.prepared.customerId,
        customerName: input.prepared.customerName,
        issuedOn: input.prepared.issuedOn,
        dueOn: input.prepared.dueOn,
        notes: input.prepared.notes,
        placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
        subtotal: input.prepared.subtotal,
        discountTotal: input.prepared.discountTotal,
        taxableAmount: input.prepared.taxableAmount,
        cgst: input.prepared.cgst,
        sgst: input.prepared.sgst,
        igst: input.prepared.igst,
        totalTax: input.prepared.totalTax,
        grandTotal: input.prepared.grandTotal,
        supplyType: input.prepared.supplyType,
        lines: withInvoiceLineIds(input.tenantId, current.id, input.prepared),
        updatedAt: new Date(),
      };
      invoices[index] = updated;
      return cloneInvoice(updated);
    },
    async markInvoicePosted(input) {
      const index = invoices.findIndex(
        (record) => record.tenantId === input.tenantId && record.id === input.invoiceId
      );
      if (index === -1) {
        return null;
      }
      if (invoices[index]!.status !== input.expectedStatus) {
        return null;
      }
      const updated: SalesInvoice = {
        ...invoices[index]!,
        status: input.status,
        journalId: input.journalId,
        postedAt: input.postedAt,
        updatedAt: new Date(),
      };
      invoices[index] = updated;
      return cloneInvoice(updated);
    },
    async updateInvoiceStatus(input) {
      const index = invoices.findIndex(
        (record) => record.tenantId === input.tenantId && record.id === input.invoiceId
      );
      if (index === -1) {
        return null;
      }
      const updated: SalesInvoice = {
        ...invoices[index]!,
        status: input.status,
        updatedAt: new Date(),
      };
      invoices[index] = updated;
      return cloneInvoice(updated);
    },
    async setInvoiceLineUnitCosts(input) {
      const index = invoices.findIndex(
        (record) => record.tenantId === input.tenantId && record.id === input.invoiceId
      );
      if (index === -1) {
        return null;
      }
      const costByLine = new Map(input.costs.map((c) => [c.lineId, c.unitCost]));
      const current = invoices[index]!;
      const updated: SalesInvoice = {
        ...current,
        lines: current.lines.map((line) => {
          const unitCost = costByLine.get(line.id);
          return unitCost !== undefined ? { ...line, unitCost } : line;
        }),
        updatedAt: new Date(),
      };
      invoices[index] = updated;
      return cloneInvoice(updated);
    },
    async lockInvoiceForUpdate(tenantId, invoiceId) {
      const record = invoices.find(
        (item) => item.tenantId === tenantId && item.id === invoiceId
      );
      return record ? cloneInvoice(record) : null;
    },
    async lockCreditNoteForUpdate(tenantId, creditNoteId) {
      const record = creditNotes.find(
        (item) => item.tenantId === tenantId && item.id === creditNoteId
      );
      return record ? cloneCreditNote(record) : null;
    },
    async findInvoiceById(tenantId, invoiceId) {
      const record = invoices.find(
        (item) => item.tenantId === tenantId && item.id === invoiceId
      );
      return record ? cloneInvoice(record) : null;
    },
    async findInvoiceBySalesOrderId(tenantId, salesOrderId) {
      const record = invoices.find(
        (item) => item.tenantId === tenantId && item.salesOrderId === salesOrderId
      );
      return record ? cloneInvoice(record) : null;
    },
    async findInvoiceByQuotationId(tenantId, quotationId) {
      const record = invoices.find(
        (item) => item.tenantId === tenantId && item.quotationId === quotationId
      );
      return record ? cloneInvoice(record) : null;
    },
    async listInvoices(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      const statuses = filter.statuses;
      const overdueAsOf = filter.overdueAsOf;
      const dueOverdue = filter.due === "OVERDUE" && overdueAsOf;
      const allocated = dueOverdue
        ? await options?.payments?.allocatedTotalsForInvoices(
            filter.tenantId,
            invoices
              .filter((record) => record.tenantId === filter.tenantId)
              .map((record) => record.id)
          )
        : undefined;

      return invoices
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.customerId && record.customerId !== filter.customerId) {
            return false;
          }
          if (filter.customerIds && filter.customerIds.length > 0) {
            if (!filter.customerIds.includes(record.customerId)) {
              return false;
            }
          }
          if (dueOverdue && overdueAsOf) {
            const paid =
              allocated?.get(record.id) ??
              money(0n, record.grandTotal.currency);
            const credited = creditNotes
              .filter(
                (note) =>
                  note.tenantId === filter.tenantId &&
                  note.invoiceId === record.id &&
                  note.status === "POSTED"
              )
              .reduce(
                (sum, note) => addMoney(sum, note.grandTotal),
                money(0n, record.grandTotal.currency)
              );
            const appliedMinor = paid.amountMinor + credited.amountMinor;
            const outstandingMinor =
              appliedMinor >= record.grandTotal.amountMinor
                ? 0n
                : record.grandTotal.amountMinor - appliedMinor;
            if (
              !isInvoiceOverdue({
                dueOn: record.dueOn,
                status: record.status,
                outstandingMinor,
                asOf: overdueAsOf,
              })
            ) {
              return false;
            }
          }
          if (statuses && statuses.length > 0) {
            return statuses.includes(record.status);
          }
          if (!filter.status || filter.status === "ALL") {
            return true;
          }
          return record.status === filter.status;
        })
        .filter((record) => {
          if (filter.fromDate && record.issuedOn < filter.fromDate) return false;
          if (filter.toDate && record.issuedOn > filter.toDate) return false;
          return true;
        })
        .filter((record) => {
          if (!query) {
            return true;
          }
          return [record.number, record.customerName]
            .some((value) => value.toLowerCase().includes(query));
        })
        .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number))
        .map(cloneInvoice);
    },
    async listInvoicesPage(filter) {
      return paginateArray(await this.listInvoices(filter), filter.page, filter.pageSize);
    },
    async allocateNextCreditNoteNumber(tenantId, financialYearKey) {
      const key = `${tenantId}:${financialYearKey}`;
      const next = (creditNoteSeries.get(key) ?? 0) + 1;
      creditNoteSeries.set(key, next);
      return next;
    },
    async createCreditNote(input) {
      const now = new Date();
      const id = crypto.randomUUID();
      const creditNote: CreditNote = {
        id,
        tenantId: input.tenantId,
        number: input.number,
        customerId: input.prepared.customerId,
        customerName: input.prepared.customerName,
        invoiceId: input.prepared.invoiceId,
        invoiceNumber: input.prepared.invoiceNumber,
        status: "DRAFT",
        journalId: null,
        issuedOn: input.prepared.issuedOn,
        notes: input.prepared.notes,
        placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
        subtotal: input.prepared.subtotal,
        discountTotal: input.prepared.discountTotal,
        taxableAmount: input.prepared.taxableAmount,
        cgst: input.prepared.cgst,
        sgst: input.prepared.sgst,
        igst: input.prepared.igst,
        totalTax: input.prepared.totalTax,
        grandTotal: input.prepared.grandTotal,
        supplyType: input.prepared.supplyType,
        postedAt: null,
        lines: withCreditNoteLineIds(input.tenantId, id, input.prepared),
        createdAt: now,
        updatedAt: now,
      };
      creditNotes.push(creditNote);
      return cloneCreditNote(creditNote);
    },
    async updateCreditNote(input) {
      const index = creditNotes.findIndex(
        (record) =>
          record.tenantId === input.tenantId && record.id === input.creditNoteId
      );
      if (index === -1) {
        return null;
      }
      const current = creditNotes[index]!;
      const updated: CreditNote = {
        ...current,
        customerId: input.prepared.customerId,
        customerName: input.prepared.customerName,
        invoiceId: input.prepared.invoiceId,
        invoiceNumber: input.prepared.invoiceNumber,
        issuedOn: input.prepared.issuedOn,
        notes: input.prepared.notes,
        placeOfSupplyStateCode: input.prepared.placeOfSupplyStateCode,
        subtotal: input.prepared.subtotal,
        discountTotal: input.prepared.discountTotal,
        taxableAmount: input.prepared.taxableAmount,
        cgst: input.prepared.cgst,
        sgst: input.prepared.sgst,
        igst: input.prepared.igst,
        totalTax: input.prepared.totalTax,
        grandTotal: input.prepared.grandTotal,
        supplyType: input.prepared.supplyType,
        lines: withCreditNoteLineIds(input.tenantId, current.id, input.prepared),
        updatedAt: new Date(),
      };
      creditNotes[index] = updated;
      return cloneCreditNote(updated);
    },
    async markCreditNotePosted(input) {
      const index = creditNotes.findIndex(
        (record) =>
          record.tenantId === input.tenantId && record.id === input.creditNoteId
      );
      if (index === -1) {
        return null;
      }
      if (creditNotes[index]!.status !== input.expectedStatus) {
        return null;
      }
      const updated: CreditNote = {
        ...creditNotes[index]!,
        status: input.status,
        journalId: input.journalId,
        postedAt: input.postedAt,
        updatedAt: new Date(),
      };
      creditNotes[index] = updated;
      return cloneCreditNote(updated);
    },
    async updateCreditNoteStatus(input) {
      const index = creditNotes.findIndex(
        (record) =>
          record.tenantId === input.tenantId && record.id === input.creditNoteId
      );
      if (index === -1) {
        return null;
      }
      const updated: CreditNote = {
        ...creditNotes[index]!,
        status: input.status,
        updatedAt: new Date(),
      };
      creditNotes[index] = updated;
      return cloneCreditNote(updated);
    },
    async findCreditNoteById(tenantId, creditNoteId) {
      const record = creditNotes.find(
        (item) => item.tenantId === tenantId && item.id === creditNoteId
      );
      return record ? cloneCreditNote(record) : null;
    },
    async listCreditNotes(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      const statuses = filter.statuses;
      return creditNotes
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.customerId && record.customerId !== filter.customerId) {
            return false;
          }
          if (filter.invoiceId && record.invoiceId !== filter.invoiceId) {
            return false;
          }
          if (statuses && statuses.length > 0) {
            return statuses.includes(record.status);
          }
          if (!filter.status || filter.status === "ALL") {
            return true;
          }
          return record.status === filter.status;
        })
        .filter((record) => {
          if (filter.fromDate && record.issuedOn < filter.fromDate) return false;
          if (filter.toDate && record.issuedOn > filter.toDate) return false;
          return true;
        })
        .filter((record) => {
          if (!query) {
            return true;
          }
          return [record.number, record.customerName, record.invoiceNumber].some(
            (value) => value.toLowerCase().includes(query)
          );
        })
        .sort(
          (a, b) =>
            b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number)
        )
        .map(cloneCreditNote);
    },
    async listCreditNotesPage(filter) {
      return paginateArray(
        await this.listCreditNotes(filter),
        filter.page,
        filter.pageSize
      );
    },
    async creditedTotalsForInvoices(tenantId, invoiceIds) {
      const totals = new Map<string, ReturnType<typeof money>>();
      if (invoiceIds.length === 0) {
        return totals;
      }
      const idSet = new Set(invoiceIds);
      for (const record of creditNotes) {
        if (record.tenantId !== tenantId || record.status !== "POSTED") {
          continue;
        }
        if (!idSet.has(record.invoiceId)) {
          continue;
        }
        const current =
          totals.get(record.invoiceId) ??
          money(0n, record.grandTotal.currency, record.grandTotal.scale);
        totals.set(record.invoiceId, addMoney(current, record.grandTotal));
      }
      return totals;
    },
    async creditedQuantityByInvoiceLine(input) {
      const quantities = new Map<string, Quantity>();
      for (const record of creditNotes) {
        if (record.tenantId !== input.tenantId) continue;
        if (record.invoiceId !== input.invoiceId) continue;
        if (record.id === input.excludeCreditNoteId) continue;
        if (
          !ACTIVE_CREDIT_NOTE_STATUSES.includes(
            record.status as (typeof ACTIVE_CREDIT_NOTE_STATUSES)[number]
          )
        ) {
          continue;
        }
        for (const line of record.lines) {
          const current = quantities.get(line.sourceInvoiceLineId) ?? quantity(0n);
          quantities.set(
            line.sourceInvoiceLineId,
            addQuantity(current, line.quantity)
          );
        }
      }
      return quantities;
    },
  };
}
