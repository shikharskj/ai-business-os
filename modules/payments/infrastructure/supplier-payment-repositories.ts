import { money, type Money } from "@/modules/shared-kernel/money";
import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type {
  PaymentMethod,
  SupplierPayment,
  SupplierPaymentAllocationInput,
  SupplierPaymentListFilter,
} from "@/modules/payments/domain/types";
import type { ListPageParams, ListPageResult } from "@/modules/shared-kernel/list-page";
import { paginateArray } from "@/modules/shared-kernel/list-page";

export type CreateSupplierPaymentRecordInput = {
  id?: string;
  tenantId: string;
  number: string;
  supplierId: string;
  supplierName: string;
  paidOn: BusinessDate;
  method: PaymentMethod;
  amount: Money;
  reference: string | null;
  notes: string | null;
  journalId: string;
  allocations: Array<SupplierPaymentAllocationInput & { purchaseNumber: string }>;
};

export type SupplierPaymentRepository = {
  allocateNextPaymentNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createPayment(input: CreateSupplierPaymentRecordInput): Promise<SupplierPayment>;
  findPaymentById(tenantId: string, paymentId: string): Promise<SupplierPayment | null>;
  listPayments(filter: SupplierPaymentListFilter): Promise<SupplierPayment[]>;
  listPaymentsPage(
    filter: SupplierPaymentListFilter & ListPageParams
  ): Promise<ListPageResult<SupplierPayment>>;
  listPaymentsForPurchase(
    tenantId: string,
    purchaseId: string
  ): Promise<SupplierPayment[]>;
  allocatedTotalsForPurchases(
    tenantId: string,
    purchaseIds: string[]
  ): Promise<Map<string, Money>>;
};

function clonePayment(payment: SupplierPayment): SupplierPayment {
  return {
    ...payment,
    allocations: payment.allocations.map((allocation) => ({ ...allocation })),
  };
}

export function createMemorySupplierPaymentRepository(
  initial: SupplierPayment[] = []
): SupplierPaymentRepository & {
  payments: SupplierPayment[];
  series: Map<string, number>;
} {
  const payments = initial.map(clonePayment);
  const series = new Map<string, number>();

  return {
    payments,
    series,
    async allocateNextPaymentNumber(tenantId, financialYearKey) {
      const key = `${tenantId}:${financialYearKey}`;
      const next = (series.get(key) ?? 0) + 1;
      series.set(key, next);
      return next;
    },
    async createPayment(input) {
      const now = new Date();
      const id = input.id ?? crypto.randomUUID();
      const payment: SupplierPayment = {
        id,
        tenantId: input.tenantId,
        number: input.number,
        supplierId: input.supplierId,
        supplierName: input.supplierName,
        paidOn: input.paidOn,
        method: input.method,
        amount: input.amount,
        reference: input.reference,
        notes: input.notes,
        journalId: input.journalId,
        allocations: input.allocations.map((allocation) => ({
          id: crypto.randomUUID(),
          tenantId: input.tenantId,
          paymentId: id,
          purchaseId: allocation.purchaseId,
          purchaseNumber: allocation.purchaseNumber,
          amount: allocation.amount,
        })),
        createdAt: now,
        updatedAt: now,
      };
      payments.push(payment);
      return clonePayment(payment);
    },
    async findPaymentById(tenantId, paymentId) {
      const record = payments.find(
        (item) => item.tenantId === tenantId && item.id === paymentId
      );
      return record ? clonePayment(record) : null;
    },
    async listPayments(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      return payments
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (filter.supplierId && record.supplierId !== filter.supplierId) {
            return false;
          }
          if (filter.method && record.method !== filter.method) return false;
          if (filter.fromDate && record.paidOn < filter.fromDate) return false;
          if (filter.toDate && record.paidOn > filter.toDate) return false;
          if (!query) {
            return true;
          }
          return [record.number, record.supplierName].some((value) =>
            value.toLowerCase().includes(query)
          );
        })
        .sort(
          (a, b) => b.paidOn.localeCompare(a.paidOn) || b.number.localeCompare(a.number)
        )
        .map(clonePayment);
    },
    async listPaymentsPage(filter) {
      return paginateArray(await this.listPayments(filter), filter.page, filter.pageSize);
    },
    async listPaymentsForPurchase(tenantId, purchaseId) {
      return payments
        .filter((record) => record.tenantId === tenantId)
        .filter((record) =>
          record.allocations.some((allocation) => allocation.purchaseId === purchaseId)
        )
        .sort(
          (a, b) => b.paidOn.localeCompare(a.paidOn) || b.number.localeCompare(a.number)
        )
        .map(clonePayment);
    },
    async allocatedTotalsForPurchases(tenantId, purchaseIds) {
      const totals = new Map<string, Money>();
      for (const purchaseId of purchaseIds) {
        let amountMinor = 0n;
        let currency = "INR";
        let scale = 2;
        for (const payment of payments) {
          if (payment.tenantId !== tenantId) {
            continue;
          }
          for (const allocation of payment.allocations) {
            if (allocation.purchaseId !== purchaseId) {
              continue;
            }
            amountMinor += allocation.amount.amountMinor;
            currency = allocation.amount.currency;
            scale = allocation.amount.scale;
          }
        }
        totals.set(purchaseId, money(amountMinor, currency, scale));
      }
      return totals;
    },
  };
}
