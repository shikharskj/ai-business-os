/**
 * Dev helper: wipe SEED-* volume dataset for the first (or only) business.
 * Prefer a full wipe before re-running `npm run db:seed:volume` from scratch.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to cleanup seed data when NODE_ENV=production.");
  }

  const tenantId =
    process.env.SEED_TENANT_ID?.trim() ||
    (await prisma.business.findFirst({ select: { id: true } }))?.id;
  if (!tenantId) {
    throw new Error("No business found");
  }

  const seedInvoices = await prisma.salesInvoice.findMany({
    where: { tenantId, notes: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const invoiceIds = seedInvoices.map((i) => i.id);

  const seedCreditNotes = await prisma.creditNote.findMany({
    where: { tenantId, notes: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const creditNoteIds = seedCreditNotes.map((c) => c.id);

  const seedOrders = await prisma.salesOrder.findMany({
    where: { tenantId, notes: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const orderIds = seedOrders.map((o) => o.id);

  const seedQuotations = await prisma.quotation.findMany({
    where: { tenantId, notes: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const quotationIds = seedQuotations.map((q) => q.id);

  const seedPurchases = await prisma.purchase.findMany({
    where: { tenantId, notes: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const purchaseIds = seedPurchases.map((p) => p.id);

  const seedPurchaseReturns = await prisma.purchaseReturn.findMany({
    where: { tenantId, notes: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const purchaseReturnIds = seedPurchaseReturns.map((p) => p.id);

  const seedCustomerPayments = await prisma.customerPayment.findMany({
    where: { tenantId, notes: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const customerPaymentIds = seedCustomerPayments.map((p) => p.id);

  const seedSupplierPayments = await prisma.supplierPayment.findMany({
    where: { tenantId, notes: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const supplierPaymentIds = seedSupplierPayments.map((p) => p.id);

  if (creditNoteIds.length > 0) {
    await prisma.creditNoteLine.deleteMany({
      where: { tenantId, creditNoteId: { in: creditNoteIds } },
    });
    await prisma.creditNote.deleteMany({
      where: { tenantId, id: { in: creditNoteIds } },
    });
  }

  if (customerPaymentIds.length > 0) {
    await prisma.customerPaymentAllocation.deleteMany({
      where: { tenantId, paymentId: { in: customerPaymentIds } },
    });
    await prisma.customerPayment.deleteMany({
      where: { tenantId, id: { in: customerPaymentIds } },
    });
  }

  if (purchaseReturnIds.length > 0) {
    await prisma.purchaseReturnLine.deleteMany({
      where: { tenantId, purchaseReturnId: { in: purchaseReturnIds } },
    });
    await prisma.purchaseReturn.deleteMany({
      where: { tenantId, id: { in: purchaseReturnIds } },
    });
  }

  if (supplierPaymentIds.length > 0) {
    await prisma.supplierPaymentAllocation.deleteMany({
      where: { tenantId, paymentId: { in: supplierPaymentIds } },
    });
    await prisma.supplierPayment.deleteMany({
      where: { tenantId, id: { in: supplierPaymentIds } },
    });
  }

  if (purchaseIds.length > 0) {
    await prisma.purchaseLine.deleteMany({
      where: { tenantId, purchaseId: { in: purchaseIds } },
    });
    await prisma.purchase.deleteMany({
      where: { tenantId, id: { in: purchaseIds } },
    });
  }

  // Clear invoice ↔ order links before deleting either side.
  if (invoiceIds.length > 0) {
    await prisma.salesInvoice.updateMany({
      where: { tenantId, id: { in: invoiceIds } },
      data: { salesOrderId: null, quotationId: null },
    });
  }
  if (orderIds.length > 0) {
    await prisma.salesOrder.updateMany({
      where: { tenantId, id: { in: orderIds } },
      data: { quotationId: null },
    });
  }

  if (invoiceIds.length > 0) {
    await prisma.salesInvoiceLine.deleteMany({
      where: { tenantId, invoiceId: { in: invoiceIds } },
    });
    await prisma.salesInvoice.deleteMany({
      where: { tenantId, id: { in: invoiceIds } },
    });
  }

  if (orderIds.length > 0) {
    await prisma.salesOrderLine.deleteMany({
      where: { tenantId, salesOrderId: { in: orderIds } },
    });
    await prisma.salesOrder.deleteMany({
      where: { tenantId, id: { in: orderIds } },
    });
  }

  if (quotationIds.length > 0) {
    await prisma.quotationLine.deleteMany({
      where: { tenantId, quotationId: { in: quotationIds } },
    });
    await prisma.quotation.deleteMany({
      where: { tenantId, id: { in: quotationIds } },
    });
  }

  const products = await prisma.product.findMany({
    where: { tenantId, sku: { startsWith: "SEED-" } },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);

  console.log({
    creditNotes: creditNoteIds.length,
    customerPayments: customerPaymentIds.length,
    salesOrders: orderIds.length,
    invoices: invoiceIds.length,
    quotations: quotationIds.length,
    purchaseReturns: purchaseReturnIds.length,
    supplierPayments: supplierPaymentIds.length,
    purchases: purchaseIds.length,
    products: productIds.length,
  });

  if (productIds.length > 0) {
    await prisma.inventoryMovement.deleteMany({
      where: { tenantId, productId: { in: productIds } },
    });
    await prisma.product.deleteMany({
      where: { tenantId, id: { in: productIds } },
    });
  }

  const parties = await prisma.party.deleteMany({
    where: { tenantId, name: { startsWith: "SEED-" } },
  });
  console.log("deleted parties", parties.count);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
