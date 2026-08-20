import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";
import type { PaymentMethod } from "@/modules/payments/domain/types";
import type {
  GstRegistrationStatus,
  GstSupplyType,
  GstTreatment,
} from "@/modules/tax/domain/types";

export const EXPENSE_CATEGORIES = [
  "RENT",
  "UTILITIES",
  "TRAVEL",
  "OFFICE",
  "MARKETING",
  "PROFESSIONAL_FEES",
  "REPAIRS",
  "INSURANCE",
  "BANK_CHARGES",
  "MEALS",
  "SOFTWARE",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT: "Rent",
  UTILITIES: "Utilities",
  TRAVEL: "Travel",
  OFFICE: "Office",
  MARKETING: "Marketing",
  PROFESSIONAL_FEES: "Professional fees",
  REPAIRS: "Repairs",
  INSURANCE: "Insurance",
  BANK_CHARGES: "Bank charges",
  MEALS: "Meals",
  SOFTWARE: "Software",
  OTHER: "Other",
};

export type Expense = {
  id: string;
  tenantId: string;
  number: string;
  category: ExpenseCategory;
  incurredOn: BusinessDate;
  method: PaymentMethod;
  vendorGstin: string | null;
  notes: string | null;
  taxableAmount: Money;
  taxRateBps: number;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType;
  treatment: GstTreatment;
  journalId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RecordExpenseInput = {
  category: ExpenseCategory;
  incurredOn: BusinessDate;
  method: PaymentMethod;
  amount: Money;
  taxRateBps?: number;
  vendorGstin?: string | null;
  notes?: string | null;
};

export type ExpenseListFilter = {
  tenantId: string;
  query?: string;
  category?: ExpenseCategory;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
};

export type ExpenseTaxContext = {
  gstin: string | null;
  gstRegistrationStatus: GstRegistrationStatus;
  stateName: string;
  defaultGstRateBps: number;
  financialYearStartMonth: number;
  currency: string;
};
