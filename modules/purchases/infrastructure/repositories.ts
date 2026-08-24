import type {
  PreparedPurchase,
  PreparedPurchaseReturn,
  Purchase,
  PurchaseListFilter,
  PurchaseReturn,
  PurchaseReturnListFilter,
  PurchaseReturnStatus,
  PurchaseStatus,
} from "@/modules/purchases/domain/types";
import type { ListPageParams, ListPageResult } from "@/modules/shared-kernel/list-page";
import { paginateArray } from "@/modules/shared-kernel/list-page";
import { addMoney, money } from "@/modules/shared-kernel/money";
import {
  addQuantity,
  quantity,
  type Quantity,
} from "@/modules/inventory/domain/quantity";
import { ACTIVE_PURCHASE_RETURN_STATUSES } from "@/modules/purchases/domain/purchase-return-status";

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
  allocateNextPurchaseReturnNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createPurchaseReturn(input: CreatePurchaseReturnRecordInput): Promise<PurchaseReturn>;
  updatePurchaseReturn(input: UpdatePurchaseReturnRecordInput): Promise<PurchaseReturn | null>;
  markPurchaseReturnPosted(input: {
    tenantId: string;
    purchaseReturnId: string;
    journalId: string;
    postedAt: Date;
    status: PurchaseReturnStatus;
    expectedStatus: PurchaseReturnStatus;
  }): Promise<PurchaseReturn | null>;
  updatePurchaseReturnStatus(input: {
    tenantId: string;
    purchaseReturnId: string;
    status: PurchaseReturnStatus;
  }): Promise<PurchaseReturn | null>;
  findPurchaseReturnById(
    tenantId: string,
    purchaseReturnId: string
  ): Promise<PurchaseReturn | null>;
  listPurchaseReturns(filter: PurchaseReturnListFilter): Promise<PurchaseReturn[]>;
  listPurchaseReturnsPage(
    filter: PurchaseReturnListFilter & ListPageParams
  ): Promise<ListPageResult<PurchaseReturn>>;
  returnedTotalsForPurchases(
    tenantId: string,
    purchaseIds: readonly string[]
  ): Promise<Map<string, import("@/modules/shared-kernel/money").Money>>;
  returnedQuantityByPurchaseLine(input: {
    tenantId: string;
    purchaseId: string;
    excludePurchaseReturnId?: string;
  }): Promise<Map<string, Quantity>>;
};

export type CreatePurchaseReturnRecordInput = {
  tenantId: string;
  number: string;
  prepared: PreparedPurchaseReturn;
};

export type UpdatePurchaseReturnRecordInput = {
  tenantId: string;
  purchaseReturnId: string;
  prepared: PreparedPurchaseReturn;
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

function clonePurchaseReturn(purchaseReturn: PurchaseReturn): PurchaseReturn {
  return {
    ...purchaseReturn,
    postedAt: purchaseReturn.postedAt
      ? new Date(purchaseReturn.postedAt.getTime())
      : null,
    lines: purchaseReturn.lines.map((line) => ({ ...line })),
  };
}

function withPurchaseReturnLineIds(
  tenantId: string,
  purchaseReturnId: string,
  prepared: PreparedPurchaseReturn
): PurchaseReturn["lines"] {
  return prepared.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    tenantId,
    purchaseReturnId,
  }));
}

export function createMemoryPurchasesRepository(
  initial: Purchase[] = []
): PurchasesRepository & {
  records: Purchase[];
  purchaseReturns: PurchaseReturn[];
  series: Map<string, number>;
  purchaseReturnSeries: Map<string, number>;
} {
  const records = initial.map(clonePurchase);
  const purchaseReturns: PurchaseReturn[] = [];
  const series = new Map<string, number>();
  const purchaseReturnSeries = new Map<string, number>();

  return {
    records,
    purchaseReturns,
    series,
    purchaseReturnSeries,
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
    async allocateNextPurchaseReturnNumber(tenantId, financialYearKey) {
      const key = `${tenantId}:${financialYearKey}`;
      const next = (purchaseReturnSeries.get(key) ?? 0) + 1;
      purchaseReturnSeries.set(key, next);
      return next;
    },
    async createPurchaseReturn(input) {
      const now = new Date();
      const id = crypto.randomUUID();
      const purchaseReturn: PurchaseReturn = {
        id,
        tenantId: input.tenantId,
        number: input.number,
        supplierId: input.prepared.supplierId,
        supplierName: input.prepared.supplierName,
        purchaseId: input.prepared.purchaseId,
        purchaseNumber: input.prepared.purchaseNumber,
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
        lines: withPurchaseReturnLineIds(input.tenantId, id, input.prepared),
        createdAt: now,
        updatedAt: now,
      };
      purchaseReturns.push(purchaseReturn);
      return clonePurchaseReturn(purchaseReturn);
    },
    async updatePurchaseReturn(input) {
      const index = purchaseReturns.findIndex(
        (record) =>
          record.tenantId === input.tenantId && record.id === input.purchaseReturnId
      );
      if (index === -1) {
        return null;
      }
      const current = purchaseReturns[index]!;
      const updated: PurchaseReturn = {
        ...current,
        supplierId: input.prepared.supplierId,
        supplierName: input.prepared.supplierName,
        purchaseId: input.prepared.purchaseId,
        purchaseNumber: input.prepared.purchaseNumber,
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
        lines: withPurchaseReturnLineIds(input.tenantId, current.id, input.prepared),
        updatedAt: new Date(),
      };
      purchaseReturns[index] = updated;
      return clonePurchaseReturn(updated);
    },
    async markPurchaseReturnPosted(input) {
      const index = purchaseReturns.findIndex(
        (record) =>
          record.tenantId === input.tenantId &&
          record.id === input.purchaseReturnId &&
          record.status === input.expectedStatus
      );
      if (index === -1) {
        return null;
      }
      const updated: PurchaseReturn = {
        ...purchaseReturns[index]!,
        status: input.status,
        journalId: input.journalId,
        postedAt: input.postedAt,
        updatedAt: new Date(),
      };
      purchaseReturns[index] = updated;
      return clonePurchaseReturn(updated);
    },
    async updatePurchaseReturnStatus(input) {
      const index = purchaseReturns.findIndex(
        (record) =>
          record.tenantId === input.tenantId && record.id === input.purchaseReturnId
      );
      if (index === -1) {
        return null;
      }
      const updated: PurchaseReturn = {
        ...purchaseReturns[index]!,
        status: input.status,
        updatedAt: new Date(),
      };
      purchaseReturns[index] = updated;
      return clonePurchaseReturn(updated);
    },
    async findPurchaseReturnById(tenantId, purchaseReturnId) {
      const record = purchaseReturns.find(
        (item) => item.tenantId === tenantId && item.id === purchaseReturnId
      );
      return record ? clonePurchaseReturn(record) : null;
    },
    async listPurchaseReturns(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      const statuses = filter.statuses;
      return purchaseReturns
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.supplierId && record.supplierId !== filter.supplierId) {
            return false;
          }
          if (filter.purchaseId && record.purchaseId !== filter.purchaseId) {
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
          return [record.number, record.supplierName, record.purchaseNumber].some(
            (value) => value.toLowerCase().includes(query)
          );
        })
        .sort(
          (a, b) =>
            b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number)
        )
        .map(clonePurchaseReturn);
    },
    async listPurchaseReturnsPage(filter) {
      return paginateArray(
        await this.listPurchaseReturns(filter),
        filter.page,
        filter.pageSize
      );
    },
    async returnedTotalsForPurchases(tenantId, purchaseIds) {
      const totals = new Map<string, ReturnType<typeof money>>();
      if (purchaseIds.length === 0) {
        return totals;
      }
      const idSet = new Set(purchaseIds);
      for (const record of purchaseReturns) {
        if (record.tenantId !== tenantId || record.status !== "POSTED") {
          continue;
        }
        if (!idSet.has(record.purchaseId)) {
          continue;
        }
        const current =
          totals.get(record.purchaseId) ??
          money(0n, record.grandTotal.currency, record.grandTotal.scale);
        totals.set(record.purchaseId, addMoney(current, record.grandTotal));
      }
      return totals;
    },
    async returnedQuantityByPurchaseLine(input) {
      const quantities = new Map<string, Quantity>();
      for (const record of purchaseReturns) {
        if (record.tenantId !== input.tenantId) continue;
        if (record.purchaseId !== input.purchaseId) continue;
        if (record.id === input.excludePurchaseReturnId) continue;
        if (
          !ACTIVE_PURCHASE_RETURN_STATUSES.includes(
            record.status as (typeof ACTIVE_PURCHASE_RETURN_STATUSES)[number]
          )
        ) {
          continue;
        }
        for (const line of record.lines) {
          const current = quantities.get(line.sourcePurchaseLineId) ?? quantity(0n);
          quantities.set(
            line.sourcePurchaseLineId,
            addQuantity(current, line.quantity)
          );
        }
      }
      return quantities;
    },
  };
}
