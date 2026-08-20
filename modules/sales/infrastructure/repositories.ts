import type { Quotation, QuotationListFilter } from "@/modules/sales/domain/types";
import type { PreparedQuotation } from "@/modules/sales/domain/types";
import type { QuotationStatus } from "@/modules/sales/domain/types";

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
};

function cloneQuotation(quotation: Quotation): Quotation {
  return {
    ...quotation,
    lines: quotation.lines.map((line) => ({ ...line })),
  };
}

function withIds(
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

export function createMemorySalesRepository(
  initial: Quotation[] = []
): SalesRepository & {
  records: Quotation[];
  series: Map<string, number>;
} {
  const records = initial.map(cloneQuotation);
  const series = new Map<string, number>();

  function findIndex(tenantId: string, quotationId: string) {
    return records.findIndex(
      (record) => record.tenantId === tenantId && record.id === quotationId
    );
  }

  return {
    records,
    series,
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
        lines: withIds(input.tenantId, id, input.prepared),
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
        lines: withIds(input.tenantId, current.id, input.prepared),
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
          if (!query) {
            return true;
          }
          return [record.number, record.customerName]
            .some((value) => value.toLowerCase().includes(query));
        })
        .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number))
        .map(cloneQuotation);
    },
  };
}
