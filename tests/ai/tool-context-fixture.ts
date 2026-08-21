import type { AiToolContext } from "@/modules/ai";
import { createMemoryCatalogRepository } from "@/modules/catalog";
import type { Product } from "@/modules/catalog/domain/types";
import { createMemoryExpenseRepository } from "@/modules/expenses";
import type { Expense } from "@/modules/expenses/domain/types";
import { createMemoryInventoryRepository } from "@/modules/inventory";
import { createMemoryNotificationRepository } from "@/modules/notifications";
import { createMemoryPartyRepository } from "@/modules/party";
import type { Party } from "@/modules/party/domain/types";
import {
  createMemoryPaymentRepository,
  createMemorySupplierPaymentRepository,
} from "@/modules/payments";
import { createMemoryPurchasesRepository } from "@/modules/purchases";
import { createMemorySalesRepository } from "@/modules/sales";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import type { MembershipRole } from "@/modules/tenant/domain/types";

export const TENANT_A = "tenant-a";
export const TENANT_B = "tenant-b";
export const CUSTOMER_A = "11111111-1111-4111-8111-111111111111";
export const CUSTOMER_B = "22222222-2222-4222-8222-222222222222";

const zero = money(0n);

/** Historic dates keep these tests independent of the current date. */
export const PERIOD = {
  preset: "custom" as const,
  fromDate: "2020-03-01",
  toDate: "2020-03-31",
};

function invoiceFixture(
  overrides: Partial<SalesInvoice> &
    Pick<SalesInvoice, "id" | "tenantId" | "number" | "status">
): SalesInvoice {
  const taxable = overrides.taxableAmount ?? money(1000_00n);
  const totalTax = overrides.totalTax ?? money(180_00n);
  const grandTotal =
    overrides.grandTotal ?? money(taxable.amountMinor + totalTax.amountMinor);
  return {
    customerId: CUSTOMER_A,
    customerName: "Acme Traders",
    quotationId: null,
    journalId: "jr-1",
    issuedOn: businessDate("2020-03-15"),
    dueOn: businessDate("2020-04-14"),
    notes: null,
    placeOfSupplyStateCode: "27",
    subtotal: taxable,
    discountTotal: zero,
    taxableAmount: taxable,
    cgst: money(90_00n),
    sgst: money(90_00n),
    igst: zero,
    totalTax,
    grandTotal,
    supplyType: "INTRA_STATE",
    postedAt: new Date(),
    lines: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function expenseFixture(
  overrides: Partial<Expense> & Pick<Expense, "id" | "tenantId" | "number">
): Expense {
  const grandTotal = overrides.grandTotal ?? money(250_00n);
  return {
    category: "OFFICE",
    incurredOn: businessDate("2020-03-20"),
    method: "CASH",
    vendorGstin: null,
    notes: null,
    taxableAmount: grandTotal,
    taxRateBps: 0,
    cgst: zero,
    sgst: zero,
    igst: zero,
    totalTax: zero,
    grandTotal,
    supplyType: "NONE",
    treatment: "EXEMPT",
    journalId: "jr-3",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function productFixture(
  overrides: Pick<Product, "id" | "tenantId" | "name" | "sku">
): Product {
  return {
    kind: "PRODUCT",
    unitOfMeasurement: "PCS",
    sellingPrice: money(100_00n),
    purchasePrice: money(80_00n),
    hsnSac: null,
    taxRateBps: 1800,
    category: null,
    tracksInventory: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function customerFixture(
  overrides: Pick<Party, "id" | "tenantId" | "name">
): Party {
  return {
    kind: "CUSTOMER",
    phone: null,
    email: null,
    billingAddressLine1: null,
    billingAddressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    country: "IN",
    gstRegistrationStatus: "NOT_REGISTERED",
    gstin: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export type TestToolContext = AiToolContext & {
  auditRecords: ReturnType<typeof createMemoryAuditRepository>["records"];
  notificationRecords: ReturnType<
    typeof createMemoryNotificationRepository
  >["records"];
};

/**
 * Trusted context, as the server would build it. Tenant, user, and role are
 * fixed here — no test path lets tool input influence them.
 */
export function toolContext(options?: {
  tenantId?: string;
  role?: MembershipRole;
}): TestToolContext {
  const tenantId = options?.tenantId ?? TENANT_A;
  const audit = createMemoryAuditRepository();
  const notifications = createMemoryNotificationRepository();

  const invoices = [
    invoiceFixture({
      id: "inv-a1",
      tenantId: TENANT_A,
      number: "INV/20-21/1",
      status: "UNPAID",
    }),
    invoiceFixture({
      id: "inv-a2",
      tenantId: TENANT_A,
      number: "INV/20-21/2",
      status: "UNPAID",
      dueOn: businessDate("2020-01-05"),
      taxableAmount: money(4000_00n),
      totalTax: money(720_00n),
      grandTotal: money(4720_00n),
      issuedOn: businessDate("2020-03-20"),
    }),
    invoiceFixture({
      id: "inv-b1",
      tenantId: TENANT_B,
      number: "INV/20-21/9",
      status: "UNPAID",
      customerId: CUSTOMER_B,
      customerName: "Other Business Co",
      taxableAmount: money(9999_00n),
      totalTax: zero,
      grandTotal: money(9999_00n),
    }),
  ];

  return {
    tenantId,
    actorUserId: "user-owner",
    role: options?.role ?? "OWNER",
    timezone: "Asia/Kolkata",
    currency: "INR",
    lowStockThresholdMajor: "5",
    repositories: {
      sales: createMemorySalesRepository([], invoices),
      purchases: createMemoryPurchasesRepository(),
      expenses: createMemoryExpenseRepository([
        expenseFixture({ id: "exp-a1", tenantId: TENANT_A, number: "EXP/1" }),
        expenseFixture({
          id: "exp-a2",
          tenantId: TENANT_A,
          number: "EXP/2",
          category: "TRAVEL",
          grandTotal: money(900_00n),
        }),
        expenseFixture({ id: "exp-b1", tenantId: TENANT_B, number: "EXP/9" }),
      ]),
      payments: createMemoryPaymentRepository(),
      supplierPayments: createMemorySupplierPaymentRepository(),
      catalog: createMemoryCatalogRepository([
        productFixture({
          id: "prod-a1",
          tenantId: TENANT_A,
          name: "Basmati Rice",
          sku: "RICE-1",
        }),
        productFixture({
          id: "prod-b1",
          tenantId: TENANT_B,
          name: "Other Product",
          sku: "OTHER-1",
        }),
      ]),
      inventory: createMemoryInventoryRepository(),
      party: createMemoryPartyRepository([
        customerFixture({
          id: CUSTOMER_A,
          tenantId: TENANT_A,
          name: "Acme Traders",
        }),
        customerFixture({
          id: CUSTOMER_B,
          tenantId: TENANT_B,
          name: "Other Business Co",
        }),
      ]),
      notifications,
    },
    audit,
    auditRecords: audit.records,
    notificationRecords: notifications.records,
    correlationId: "corr-1",
  };
}
