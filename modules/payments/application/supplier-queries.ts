import { remainingOutstanding } from "@/modules/payments/domain/allocation";
import { PaymentNotFoundError } from "@/modules/payments/domain/errors";
import type {
  PurchaseOutstanding,
  SupplierPayment,
  SupplierPaymentListFilter,
} from "@/modules/payments/domain/types";
import type { SupplierPaymentRepository } from "@/modules/payments/infrastructure/supplier-payment-repositories";
import {
  isPostedPurchaseStatus,
  PAYABLE_PURCHASE_STATUSES,
  type SupplierOutstanding,
} from "@/modules/purchases";
import type { PurchasesRepository } from "@/modules/purchases/infrastructure/repositories";
import { addMoney, money } from "@/modules/shared-kernel/money";

export async function getSupplierPayment(input: {
  tenantId: string;
  paymentId: string;
  supplierPayments: SupplierPaymentRepository;
}): Promise<SupplierPayment> {
  const payment = await input.supplierPayments.findPaymentById(
    input.tenantId,
    input.paymentId
  );
  if (!payment) {
    throw new PaymentNotFoundError();
  }
  return payment;
}

export async function listSupplierPaymentsPage(input: {
  tenantId: string;
  query?: string;
  supplierId?: string;
  method?: SupplierPaymentListFilter["method"];
  fromDate?: SupplierPaymentListFilter["fromDate"];
  toDate?: SupplierPaymentListFilter["toDate"];
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  supplierPayments: SupplierPaymentRepository;
}) {
  return input.supplierPayments.listPaymentsPage({
    tenantId: input.tenantId,
    query: input.query,
    supplierId: input.supplierId,
    method: input.method,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listSupplierPayments(input: {
  tenantId: string;
  query?: string;
  supplierId?: string;
  supplierPayments: SupplierPaymentRepository;
}): Promise<SupplierPayment[]> {
  return input.supplierPayments.listPayments({
    tenantId: input.tenantId,
    query: input.query,
    supplierId: input.supplierId,
  });
}

export async function listPaymentsForPurchase(input: {
  tenantId: string;
  purchaseId: string;
  supplierPayments: SupplierPaymentRepository;
}): Promise<SupplierPayment[]> {
  return input.supplierPayments.listPaymentsForPurchase(
    input.tenantId,
    input.purchaseId
  );
}

async function outstandingForPurchases(input: {
  tenantId: string;
  purchases: Awaited<ReturnType<PurchasesRepository["listPurchases"]>>;
  supplierPayments: SupplierPaymentRepository;
}): Promise<PurchaseOutstanding[]> {
  const allocated = await input.supplierPayments.allocatedTotalsForPurchases(
    input.tenantId,
    input.purchases.map((purchase) => purchase.id)
  );
  return input.purchases.map((purchase) => {
    const allocatedAmount =
      allocated.get(purchase.id) ?? money(0n, purchase.grandTotal.currency);
    return {
      purchaseId: purchase.id,
      purchaseNumber: purchase.number,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      status: purchase.status,
      issuedOn: purchase.issuedOn,
      dueOn: purchase.dueOn,
      grandTotal: purchase.grandTotal,
      allocated: allocatedAmount,
      outstanding: remainingOutstanding(purchase.grandTotal, allocatedAmount),
    };
  });
}

export async function getPurchaseOutstanding(input: {
  tenantId: string;
  purchaseId: string;
  purchases: PurchasesRepository;
  supplierPayments: SupplierPaymentRepository;
}): Promise<PurchaseOutstanding | null> {
  const purchase = await input.purchases.findPurchaseById(
    input.tenantId,
    input.purchaseId
  );
  if (!purchase) {
    return null;
  }
  const [row] = await outstandingForPurchases({
    tenantId: input.tenantId,
    purchases: [purchase],
    supplierPayments: input.supplierPayments,
  });
  return row ?? null;
}

export async function listOpenPayablePurchases(input: {
  tenantId: string;
  supplierId: string;
  purchases: PurchasesRepository;
  supplierPayments: SupplierPaymentRepository;
}): Promise<PurchaseOutstanding[]> {
  const bills = await input.purchases.listPurchases({
    tenantId: input.tenantId,
    supplierId: input.supplierId,
    statuses: [...PAYABLE_PURCHASE_STATUSES],
  });
  const rows = await outstandingForPurchases({
    tenantId: input.tenantId,
    purchases: bills,
    supplierPayments: input.supplierPayments,
  });
  return rows.filter((row) => row.outstanding.amountMinor > 0n);
}

export async function getSupplierOutstanding(input: {
  tenantId: string;
  supplierId: string;
  purchases: PurchasesRepository;
  supplierPayments: SupplierPaymentRepository;
}): Promise<SupplierOutstanding> {
  const bills = await input.purchases.listPurchases({
    tenantId: input.tenantId,
    supplierId: input.supplierId,
  });
  const posted = bills.filter((bill) => isPostedPurchaseStatus(bill.status));
  const rows = await outstandingForPurchases({
    tenantId: input.tenantId,
    purchases: posted,
    supplierPayments: input.supplierPayments,
  });
  const outstanding = rows.reduce(
    (sum, row) => addMoney(sum, row.outstanding),
    money(0n)
  );
  return {
    supplierId: input.supplierId,
    outstanding,
    openBillCount: rows.filter((row) => row.outstanding.amountMinor > 0n).length,
    hasPostedPurchases: posted.length > 0,
  };
}
