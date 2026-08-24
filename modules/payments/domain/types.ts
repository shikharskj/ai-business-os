import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";
import type {
  PurchaseStatus,
  SupplierOutstanding,
} from "@/modules/purchases/domain/types";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

export type { SupplierOutstanding };

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CARD",
  "CHEQUE",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
};

export type PaymentAllocation = {
  id: string;
  tenantId: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: Money;
};

export type CustomerPayment = {
  id: string;
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
  allocations: PaymentAllocation[];
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentAllocationInput = {
  invoiceId: string;
  amount: Money;
};

export type RecordCustomerPaymentInput = {
  customerId: string;
  receivedOn: BusinessDate;
  method: PaymentMethod;
  amount: Money;
  reference?: string | null;
  notes?: string | null;
  allocations: PaymentAllocationInput[];
};

export type ApplyCustomerAdvanceInput = {
  paymentId: string;
  allocations: PaymentAllocationInput[];
};

export type ApplyCustomerCreditInput = {
  customerId: string;
  allocations: PaymentAllocationInput[];
};

export type CustomerAdvance = {
  customerId: string;
  unallocated: Money;
  receiptCount: number;
};

export type PaymentListFilter = {
  tenantId: string;
  query?: string;
  customerId?: string;
  method?: PaymentMethod;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type InvoiceOutstanding = {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  status: SalesInvoiceStatus;
  issuedOn: BusinessDate;
  dueOn: BusinessDate | null;
  grandTotal: Money;
  allocated: Money;
  outstanding: Money;
};

export type CustomerOutstanding = {
  customerId: string;
  outstanding: Money;
  openInvoiceCount: number;
  hasPostedInvoices: boolean;
};

export type SupplierPaymentAllocation = {
  id: string;
  tenantId: string;
  paymentId: string;
  purchaseId: string;
  purchaseNumber: string;
  amount: Money;
};

export type SupplierPayment = {
  id: string;
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
  allocations: SupplierPaymentAllocation[];
  createdAt: Date;
  updatedAt: Date;
};

export type SupplierPaymentAllocationInput = {
  purchaseId: string;
  amount: Money;
};

export type RecordSupplierPaymentInput = {
  supplierId: string;
  paidOn: BusinessDate;
  method: PaymentMethod;
  amount: Money;
  reference?: string | null;
  notes?: string | null;
  allocations: SupplierPaymentAllocationInput[];
};

export type SupplierPaymentListFilter = {
  tenantId: string;
  query?: string;
  supplierId?: string;
  method?: PaymentMethod;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type PurchaseOutstanding = {
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  issuedOn: BusinessDate;
  dueOn: BusinessDate | null;
  grandTotal: Money;
  allocated: Money;
  outstanding: Money;
};
