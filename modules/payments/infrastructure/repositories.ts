import { addMoney, money, type Money } from "@/modules/shared-kernel/money";
import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type {
  CustomerPayment,
  PaymentAllocationInput,
  PaymentListFilter,
  PaymentMethod,
} from "@/modules/payments/domain/types";
import type { ListPageParams, ListPageResult } from "@/modules/shared-kernel/list-page";
import { paginateArray } from "@/modules/shared-kernel/list-page";

export type CreateCustomerPaymentRecordInput = {
  id?: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  receivedOn: BusinessDate;
  method: PaymentMethod;
  amount: Money;
  reference: string | null;
  notes: string | null;
  journalId: string;
  allocations: Array<PaymentAllocationInput & { invoiceNumber: string }>;
};

export type PaymentRepository = {
  allocateNextPaymentNumber(
    tenantId: string,
    financialYearKey: string
  ): Promise<number>;
  createPayment(input: CreateCustomerPaymentRecordInput): Promise<CustomerPayment>;
  findPaymentById(tenantId: string, paymentId: string): Promise<CustomerPayment | null>;
  listPayments(filter: PaymentListFilter): Promise<CustomerPayment[]>;
  listPaymentsPage(
    filter: PaymentListFilter & ListPageParams
  ): Promise<ListPageResult<CustomerPayment>>;
  listPaymentsForInvoice(
    tenantId: string,
    invoiceId: string
  ): Promise<CustomerPayment[]>;
  allocatedTotalsForInvoices(
    tenantId: string,
    invoiceIds: string[]
  ): Promise<Map<string, Money>>;
  lockPaymentForUpdate(
    tenantId: string,
    paymentId: string
  ): Promise<CustomerPayment | null>;
  addPaymentAllocations(input: {
    tenantId: string;
    paymentId: string;
    allocations: Array<PaymentAllocationInput & { invoiceNumber: string }>;
  }): Promise<CustomerPayment | null>;
};

function clonePayment(payment: CustomerPayment): CustomerPayment {
  return {
    ...payment,
    allocations: payment.allocations.map((allocation) => ({ ...allocation })),
  };
}

export function createMemoryPaymentRepository(
  initial: CustomerPayment[] = []
): PaymentRepository & {
  payments: CustomerPayment[];
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
      const payment: CustomerPayment = {
        id,
        tenantId: input.tenantId,
        number: input.number,
        customerId: input.customerId,
        customerName: input.customerName,
        receivedOn: input.receivedOn,
        method: input.method,
        amount: input.amount,
        reference: input.reference,
        notes: input.notes,
        journalId: input.journalId,
        allocations: input.allocations.map((allocation) => ({
          id: crypto.randomUUID(),
          tenantId: input.tenantId,
          paymentId: id,
          invoiceId: allocation.invoiceId,
          invoiceNumber: allocation.invoiceNumber,
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
          if (filter.customerId && record.customerId !== filter.customerId) {
            return false;
          }
          if (filter.method && record.method !== filter.method) return false;
          if (filter.fromDate && record.receivedOn < filter.fromDate) return false;
          if (filter.toDate && record.receivedOn > filter.toDate) return false;
          if (!query) {
            return true;
          }
          return [record.number, record.customerName]
            .some((value) => value.toLowerCase().includes(query));
        })
        .sort(
          (a, b) =>
            b.receivedOn.localeCompare(a.receivedOn) || b.number.localeCompare(a.number)
        )
        .map(clonePayment);
    },
    async listPaymentsPage(filter) {
      return paginateArray(await this.listPayments(filter), filter.page, filter.pageSize);
    },
    async listPaymentsForInvoice(tenantId, invoiceId) {
      return payments
        .filter((record) => record.tenantId === tenantId)
        .filter((record) =>
          record.allocations.some((allocation) => allocation.invoiceId === invoiceId)
        )
        .sort(
          (a, b) =>
            b.receivedOn.localeCompare(a.receivedOn) || b.number.localeCompare(a.number)
        )
        .map(clonePayment);
    },
    async allocatedTotalsForInvoices(tenantId, invoiceIds) {
      const totals = new Map<string, Money>();
      for (const invoiceId of invoiceIds) {
        let amountMinor = 0n;
        let currency = "INR";
        let scale = 2;
        for (const payment of payments) {
          if (payment.tenantId !== tenantId) {
            continue;
          }
          for (const allocation of payment.allocations) {
            if (allocation.invoiceId !== invoiceId) {
              continue;
            }
            amountMinor += allocation.amount.amountMinor;
            currency = allocation.amount.currency;
            scale = allocation.amount.scale;
          }
        }
        totals.set(invoiceId, money(amountMinor, currency, scale));
      }
      return totals;
    },
    async lockPaymentForUpdate(tenantId, paymentId) {
      return this.findPaymentById(tenantId, paymentId);
    },
    async addPaymentAllocations(input) {
      const record = payments.find(
        (item) => item.tenantId === input.tenantId && item.id === input.paymentId
      );
      if (!record) {
        return null;
      }
      const now = new Date();
      for (const allocation of input.allocations) {
        const existing = record.allocations.find(
          (row) => row.invoiceId === allocation.invoiceId
        );
        if (existing) {
          existing.amount = addMoney(existing.amount, allocation.amount);
          existing.invoiceNumber = allocation.invoiceNumber || existing.invoiceNumber;
        } else {
          record.allocations.push({
            id: crypto.randomUUID(),
            tenantId: input.tenantId,
            paymentId: record.id,
            invoiceId: allocation.invoiceId,
            invoiceNumber: allocation.invoiceNumber,
            amount: allocation.amount,
          });
        }
      }
      record.updatedAt = now;
      return clonePayment(record);
    },
  };
}
