import type {
  PreparedPurchase,
  Purchase,
  PurchaseListFilter,
  PurchaseStatus,
} from "@/modules/purchases/domain/types";
import type { ListPageParams, ListPageResult } from "@/modules/shared-kernel/list-page";
import { paginateArray } from "@/modules/shared-kernel/list-page";

export type CreatePurchaseRecordInput = {
  tenantId: string;
  number: string;
  prepared: PreparedPurchase;
};

export type UpdatePurchaseRecordInput = {
  tenantId: string;
  purchaseId: string;
  prepared: PreparedPurchase;
  expectedStatus: PurchaseStatus;
};

export type PurchasesRepository = {
  allocateNextPurchaseNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createPurchase(input: CreatePurchaseRecordInput): Promise<Purchase>;
  updatePurchase(input: UpdatePurchaseRecordInput): Promise<Purchase | null>;
  markPurchasePosted(input: {
    tenantId: string;
    purchaseId: string;
    journalId: string;
    postedAt: Date;
    status: PurchaseStatus;
    expectedStatus: PurchaseStatus;
  }): Promise<Purchase | null>;
  updatePurchaseStatus(input: {
    tenantId: string;
    purchaseId: string;
    status: PurchaseStatus;
  }): Promise<Purchase | null>;
  lockPurchaseForUpdate(
    tenantId: string,
    purchaseId: string
  ): Promise<Purchase | null>;
  findPurchaseById(tenantId: string, purchaseId: string): Promise<Purchase | null>;
  listPurchases(filter: PurchaseListFilter): Promise<Purchase[]>;
  listPurchasesPage(
    filter: PurchaseListFilter & ListPageParams
  ): Promise<ListPageResult<Purchase>>;
};

function clonePurchase(purchase: Purchase): Purchase {
  return {
    ...purchase,
    postedAt: purchase.postedAt ? new Date(purchase.postedAt.getTime()) : null,
    lines: purchase.lines.map((line) => ({ ...line })),
  };
}

function withLineIds(
  tenantId: string,
  purchaseId: string,
  prepared: PreparedPurchase
): Purchase["lines"] {
  return prepared.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    tenantId,
    purchaseId,
  }));
}

export function createMemoryPurchasesRepository(
  initial: Purchase[] = []
): PurchasesRepository & {
  records: Purchase[];
  series: Map<string, number>;
} {
  const records = initial.map(clonePurchase);
  const series = new Map<string, number>();

  return {
    records,
    series,
    async allocateNextPurchaseNumber(tenantId, financialYearKey) {
      const key = `${tenantId}:${financialYearKey}`;
      const next = (series.get(key) ?? 0) + 1;
      series.set(key, next);
      return next;
    },
    async createPurchase(input) {
      const now = new Date();
      const id = crypto.randomUUID();
      const purchase: Purchase = {
        id,
        tenantId: input.tenantId,
        number: input.number,
        supplierId: input.prepared.supplierId,
        supplierName: input.prepared.supplierName,
        status: "DRAFT",
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
        lines: withLineIds(input.tenantId, id, input.prepared),
        createdAt: now,
        updatedAt: now,
      };
      records.push(purchase);
      return clonePurchase(purchase);
    },
    async updatePurchase(input) {
      const index = records.findIndex(
        (record) =>
          record.tenantId === input.tenantId &&
          record.id === input.purchaseId &&
          record.status === input.expectedStatus
      );
      if (index === -1) {
        return null;
      }
      const current = records[index]!;
      const updated: Purchase = {
        ...current,
        supplierId: input.prepared.supplierId,
        supplierName: input.prepared.supplierName,
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
        lines: withLineIds(input.tenantId, current.id, input.prepared),
        updatedAt: new Date(),
      };
      records[index] = updated;
      return clonePurchase(updated);
    },
    async markPurchasePosted(input) {
      const index = records.findIndex(
        (record) =>
          record.tenantId === input.tenantId &&
          record.id === input.purchaseId &&
          record.status === input.expectedStatus
      );
      if (index === -1) {
        return null;
      }
      const updated: Purchase = {
        ...records[index]!,
        status: input.status,
        journalId: input.journalId,
        postedAt: input.postedAt,
        updatedAt: new Date(),
      };
      records[index] = updated;
      return clonePurchase(updated);
    },
    async updatePurchaseStatus(input) {
      const index = records.findIndex(
        (record) => record.tenantId === input.tenantId && record.id === input.purchaseId
      );
      if (index === -1) {
        return null;
      }
      const updated: Purchase = {
        ...records[index]!,
        status: input.status,
        updatedAt: new Date(),
      };
      records[index] = updated;
      return clonePurchase(updated);
    },
    async lockPurchaseForUpdate(tenantId, purchaseId) {
      const record = records.find(
        (item) => item.tenantId === tenantId && item.id === purchaseId
      );
      return record ? clonePurchase(record) : null;
    },
    async findPurchaseById(tenantId, purchaseId) {
      const record = records.find(
        (item) => item.tenantId === tenantId && item.id === purchaseId
      );
      return record ? clonePurchase(record) : null;
    },
    async listPurchases(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      const statuses = filter.statuses;
      return records
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.supplierId && record.supplierId !== filter.supplierId) {
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
          return [record.number, record.supplierName].some((value) =>
            value.toLowerCase().includes(query)
          );
        })
        .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number))
        .map(clonePurchase);
    },
    async listPurchasesPage(filter) {
      return paginateArray(await this.listPurchases(filter), filter.page, filter.pageSize);
    },
  };
}
