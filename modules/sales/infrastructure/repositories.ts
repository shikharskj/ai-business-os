import type {
  InvoiceListFilter,
  PreparedInvoice,
  PreparedQuotation,
  Quotation,
  QuotationListFilter,
  SalesInvoice,
  SalesInvoiceStatus,
} from "@/modules/sales/domain/types";
import type { QuotationStatus } from "@/modules/sales/domain/types";
import type { ListPageParams, ListPageResult } from "@/modules/shared-kernel/list-page";
import { paginateArray } from "@/modules/shared-kernel/list-page";

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
};

export type UpdateInvoiceRecordInput = {
  tenantId: string;
  invoiceId: string;
  prepared: PreparedInvoice;
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
  }): Promise<SalesInvoice | null>;
  updateInvoiceStatus(input: {
    tenantId: string;
    invoiceId: string;
    status: SalesInvoiceStatus;
  }): Promise<SalesInvoice | null>;
  lockInvoiceForUpdate(
    tenantId: string,
    invoiceId: string
  ): Promise<SalesInvoice | null>;
  findInvoiceById(tenantId: string, invoiceId: string): Promise<SalesInvoice | null>;
  findInvoiceByQuotationId(
    tenantId: string,
    quotationId: string
  ): Promise<SalesInvoice | null>;
  listInvoices(filter: InvoiceListFilter): Promise<SalesInvoice[]>;
  listInvoicesPage(
    filter: InvoiceListFilter & ListPageParams
  ): Promise<ListPageResult<SalesInvoice>>;
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
  }));
}

export function createMemorySalesRepository(
  initial: Quotation[] = [],
  initialInvoices: SalesInvoice[] = []
): SalesRepository & {
  records: Quotation[];
  invoices: SalesInvoice[];
  series: Map<string, number>;
  invoiceSeries: Map<string, number>;
} {
  const records = initial.map(cloneQuotation);
  const invoices = initialInvoices.map(cloneInvoice);
  const series = new Map<string, number>();
  const invoiceSeries = new Map<string, number>();

  function findIndex(tenantId: string, quotationId: string) {
    return records.findIndex(
      (record) => record.tenantId === tenantId && record.id === quotationId
    );
  }

  return {
    records,
    invoices,
    series,
    invoiceSeries,
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
    async lockInvoiceForUpdate(tenantId, invoiceId) {
      const record = invoices.find(
        (item) => item.tenantId === tenantId && item.id === invoiceId
      );
      return record ? cloneInvoice(record) : null;
    },
    async findInvoiceById(tenantId, invoiceId) {
      const record = invoices.find(
        (item) => item.tenantId === tenantId && item.id === invoiceId
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
      return invoices
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.customerId && record.customerId !== filter.customerId) {
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
          return [record.number, record.customerName]
            .some((value) => value.toLowerCase().includes(query));
        })
        .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number))
        .map(cloneInvoice);
    },
    async listInvoicesPage(filter) {
      return paginateArray(await this.listInvoices(filter), filter.page, filter.pageSize);
    },
  };
}
