/**
 * Local volume dataset seed (not a product feature).
 *
 * Loads dummy Indian SME data for one existing business via domain use cases:
 * customers, products (+ opening stock), quotations, sales orders, invoices,
 * credit notes, customer payments, suppliers, purchase bills, purchase returns,
 * supplier payments.
 *
 * Run: `npm run db:seed:volume`
 * Optional tenant: `SEED_TENANT_ID=<uuid>` or `--tenant=<uuid>`
 *
 * If SEED- customers already exist, runs in **fill-gaps** mode: skips entity
 * types that already have SEED-* rows and only creates what is missing.
 *
 * Uses Vitest so `server-only` is stubbed. Aborts if NODE_ENV=production.
 */
import "dotenv/config";

import { describe, expect, it } from "vitest";

import {
  createPrismaAccountRepository,
  createPrismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import { createProduct } from "@/modules/catalog";
import { createPrismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import {
  quantityFromMajor,
  recordOpeningStock,
  toQuantityMajorString,
} from "@/modules/inventory";
import { createPrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { createCustomer, createSupplier } from "@/modules/party";
import { createPrismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import {
  createPrismaPaymentRepository,
} from "@/modules/payments/infrastructure/prisma-payments-repository";
import {
  createPrismaSupplierPaymentRepository,
} from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import {
  getInvoiceOutstanding,
  getPurchaseOutstanding,
  recordCustomerPayment,
  recordSupplierPayment,
} from "@/modules/payments";
import {
  createPurchase,
  createPurchaseReturn,
  postPurchase,
  postPurchaseReturn,
} from "@/modules/purchases";
import { createPrismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import {
  acceptQuotation,
  cancelQuotation,
  cancelSalesOrder,
  confirmSalesOrder,
  createCreditNote,
  createInvoice,
  createQuotation,
  createSalesOrder,
  postCreditNote,
  postInvoice,
  sendQuotation,
} from "@/modules/sales";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  prismaHsnSacRepository,
  prismaTaxRateRepository,
} from "@/modules/tax/infrastructure/prisma-tax-repositories";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const SEED_PREFIX = "SEED-";
const CUSTOMER_COUNT = 100;
const SUPPLIER_COUNT = 50;
const PRODUCT_COUNT = 500;
const QUOTATION_COUNT = 100;
const SALES_ORDER_COUNT = 100;
const INVOICE_COUNT = 100;
const CREDIT_NOTE_COUNT = 30;
const CUSTOMER_PAYMENT_COUNT = 40;
const PURCHASE_COUNT = 50;
const PURCHASE_RETURN_COUNT = 20;
const SUPPLIER_PAYMENT_COUNT = 20;
const POST_INVOICE_RATIO = 0.6;
const POST_CREDIT_NOTE_RATIO = 0.65;
const POST_PURCHASE_RATIO = 0.6;
const POST_PURCHASE_RETURN_RATIO = 0.5;

const STATE_POOL = [
  { code: "27", name: "Maharashtra", city: "Mumbai", pin: "400001" },
  { code: "29", name: "Karnataka", city: "Bengaluru", pin: "560001" },
  { code: "24", name: "Gujarat", city: "Ahmedabad", pin: "380001" },
  { code: "07", name: "Delhi", city: "New Delhi", pin: "110001" },
  { code: "33", name: "Tamil Nadu", city: "Chennai", pin: "600001" },
] as const;

const HSN_SAMPLES = ["10063010", "84713000", "94036000", "21069099", "39269099"];
const TAX_RATES_BPS = [500, 1200, 1800, 2800] as const;
const UNITS = ["PCS", "KG", "LTR", "NOS", "BOX"] as const;
const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE"] as const;

type Rng = () => number;

type SeedCustomer = { id: string; placeOfSupplyStateCode: string };
type SeedProduct = {
  id: string;
  tracksInventory: boolean;
  kind: "PRODUCT" | "SERVICE";
};
type PostedInvoiceSeed = {
  id: string;
  customerId: string;
  issuedOn: string;
  lineId: string;
  lineQtyMajor: string;
};

function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** Valid-format dummy GSTIN (pattern only; not a real taxpayer id). */
function dummyGstin(stateCode: string, index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const pan5 = `AAAA${letters[index % 26]!}`.slice(0, 5);
  const digits4 = pad(index % 10000, 4);
  const entityLetter = "A";
  const entityNum = String(1 + (index % 9));
  const check = letters[(index * 3) % 26]!;
  return `${stateCode}${pan5}${digits4}${entityLetter}${entityNum}Z${check}`;
}

function parseArgs(argv: string[]): { tenantId?: string } {
  let tenantId = process.env.SEED_TENANT_ID?.trim() || undefined;
  for (const arg of argv) {
    if (arg.startsWith("--tenant=")) {
      tenantId = arg.slice("--tenant=".length).trim() || undefined;
    }
  }
  const standalone = argv.findIndex((a) => a === "--tenant");
  if (standalone >= 0 && argv[standalone + 1] && !argv[standalone + 1]!.startsWith("-")) {
    tenantId = argv[standalone + 1];
  }
  return { tenantId };
}

function assertSafeEnv(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed volume data when NODE_ENV=production.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
}

function createPrisma(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter, errorFormat: "pretty" });
}

function taxContextFromBusiness(business: {
  gstin: string | null;
  gstRegistrationStatus: "NOT_REGISTERED" | "REGISTERED" | "COMPOSITION";
  state: string;
  defaultGstRateBps: number;
  financialYearStartMonth: number;
  currency: string;
}) {
  return {
    gstin: business.gstin,
    gstRegistrationStatus: business.gstRegistrationStatus,
    stateName: business.state,
    defaultGstRateBps: business.defaultGstRateBps,
    financialYearStartMonth: business.financialYearStartMonth,
    currency: business.currency,
  };
}

function issuedOnForIndex(index: number): string {
  const day = 1 + (index % 28);
  const month = 4 + (index % 5);
  return `2026-${pad(month, 2)}-${pad(day, 2)}`;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

function stateCodeFromName(stateName: string | null | undefined): string {
  const match = STATE_POOL.find((s) => s.name === stateName);
  return match?.code ?? "27";
}

function creditQtyMajor(lineQtyMajor: string): string {
  const major = Number.parseFloat(lineQtyMajor);
  if (!Number.isFinite(major) || major <= 0) return "1";
  if (major >= 1) return "1";
  return lineQtyMajor;
}

async function seedVolumeDataset(): Promise<void> {
  assertSafeEnv();
  const { tenantId: tenantArg } = parseArgs(process.argv.slice(2));
  const prisma = createPrisma();
  const rng = createRng(20260823);

  try {
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        ownerUserId: true,
        gstin: true,
        gstRegistrationStatus: true,
        state: true,
        defaultGstRateBps: true,
        financialYearStartMonth: true,
        currency: true,
        closedThroughPeriodKey: true,
      },
    });

    const business = tenantArg
      ? businesses.find((b) => b.id === tenantArg)
      : businesses.length === 1
        ? businesses[0]
        : undefined;

    if (tenantArg && !business) {
      throw new Error(`No business found for --tenant=${tenantArg}`);
    }
    if (!business) {
      throw new Error(
        businesses.length === 0
          ? "No business found. Create a business in the app first."
          : `Multiple businesses found (${businesses.length}). Pass --tenant=<businessId>.`
      );
    }

    const tenantId = business.id;
    const actorUserId = business.ownerUserId;
    const taxContext = taxContextFromBusiness(business);

    const existingCustomer = await prisma.party.findFirst({
      where: {
        tenantId,
        kind: "CUSTOMER",
        name: { startsWith: SEED_PREFIX },
      },
      select: { id: true, name: true },
    });
    // Fill-gaps / extend: reuse existing SEED parties & docs; only create missing entity types.
    const extendOnly = Boolean(existingCustomer);
    if (extendOnly) {
      console.log(
        `Fill-gaps mode for ${business.name} (${tenantId}) — skip entity types that already have SEED-* rows…`
      );
    } else {
      console.log(`Seeding tenant ${business.name} (${tenantId})…`);
    }

    const catalog = createPrismaCatalogRepository(prisma);
    const sales = createPrismaSalesRepository(prisma);
    const inventory = createPrismaInventoryRepository(prisma);
    const accounts = createPrismaAccountRepository(prisma);
    const payments = createPrismaPaymentRepository(prisma);
    const supplierPayments = createPrismaSupplierPaymentRepository(prisma);
    const purchasesRepo = createPrismaPurchasesRepository(prisma);
    const audit = createPrismaAuditRepository(prisma);
    const outbox = createPrismaOutboxRepository(prisma);
    const taxRates = prismaTaxRateRepository;
    const hsnSac = prismaHsnSacRepository;

    let customers: SeedCustomer[] = [];
    let products: SeedProduct[] = [];
    let stockCount = 0;
    let postedInvoices: PostedInvoiceSeed[] = [];

    if (!extendOnly) {
      for (let i = 1; i <= CUSTOMER_COUNT; i++) {
        const region = pick(rng, STATE_POOL);
        const registered = i % 5 < 2;
        const customer = await createCustomer({
          tenantId,
          actorUserId,
          prisma,
          fields: {
            name: `${SEED_PREFIX}Customer-${pad(i, 3)}`,
            phone: `98${pad(1_000_000 + i, 8)}`,
            email: `seed.customer${pad(i, 3)}@example.test`,
            billingAddressLine1: `${i} Seed Street`,
            city: region.city,
            state: region.name,
            postalCode: region.pin,
            country: "IN",
            gstRegistrationStatus: registered ? "REGISTERED" : "NOT_REGISTERED",
            gstin: registered ? dummyGstin(region.code, i) : null,
          },
        });
        customers.push({
          id: customer.id,
          placeOfSupplyStateCode: region.code,
        });
        if (i % 25 === 0) console.log(`  customers ${i}/${CUSTOMER_COUNT}`);
      }

      for (let i = 1; i <= PRODUCT_COUNT; i++) {
        const isService = i % 10 >= 7;
        const tracksInventory = !isService && i % 2 === 0;
        const sellingMajor = intBetween(rng, 50, 5000);
        const purchaseMajor = Math.max(10, Math.floor(sellingMajor * 0.7));
        const product = await createProduct({
          tenantId,
          actorUserId,
          catalog,
          audit,
          outbox,
          fields: {
            kind: isService ? "SERVICE" : "PRODUCT",
            name: `${SEED_PREFIX}Product-${pad(i, 4)}`,
            sku: `${SEED_PREFIX}SKU-${pad(i, 4)}`,
            unitOfMeasurement: pick(rng, UNITS),
            sellingPrice: money(BigInt(sellingMajor) * 100n),
            purchasePrice: money(BigInt(purchaseMajor) * 100n),
            hsnSac: pick(rng, HSN_SAMPLES),
            taxRateBps: pick(rng, TAX_RATES_BPS),
            category: isService ? "Services" : "Goods",
            tracksInventory,
          },
        });
        products.push({
          id: product.id,
          tracksInventory,
          kind: product.kind,
        });
        if (i % 50 === 0) console.log(`  products ${i}/${PRODUCT_COUNT}`);
      }

      const tracked = products.filter((p) => p.tracksInventory);
      for (const product of tracked) {
        await recordOpeningStock({
          tenantId,
          actorUserId,
          productId: product.id,
          quantity: quantityFromMajor(String(intBetween(rng, 50, 500))),
          occurredOn: businessDate("2026-04-01"),
          catalog,
          inventory,
          audit,
          outbox,
        });
        stockCount += 1;
        if (stockCount % 50 === 0) {
          console.log(`  opening stock ${stockCount}/${tracked.length}`);
        }
      }
      console.log(`  opening stock done (${stockCount})`);
    } else {
      const partyRows = await prisma.party.findMany({
        where: { tenantId, kind: "CUSTOMER", name: { startsWith: SEED_PREFIX } },
        select: { id: true, state: true },
        orderBy: { name: "asc" },
      });
      customers = partyRows.map((row) => ({
        id: row.id,
        placeOfSupplyStateCode: stateCodeFromName(row.state),
      }));

      const productRows = await prisma.product.findMany({
        where: { tenantId, sku: { startsWith: SEED_PREFIX } },
        select: { id: true, tracksInventory: true, kind: true },
        orderBy: { sku: "asc" },
      });
      products = productRows.map((row) => ({
        id: row.id,
        tracksInventory: row.tracksInventory,
        kind: row.kind === "SERVICE" ? "SERVICE" : "PRODUCT",
      }));

      const invoiceRows = await prisma.salesInvoice.findMany({
        where: {
          tenantId,
          notes: { startsWith: SEED_PREFIX },
          status: { in: ["POSTED", "UNPAID", "PARTIALLY_PAID", "PAID"] },
        },
        select: {
          id: true,
          customerId: true,
          issuedOn: true,
          lines: { select: { id: true, quantity: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        },
        orderBy: { number: "asc" },
      });
      postedInvoices = invoiceRows
        .filter((row) => row.lines[0])
        .map((row) => ({
          id: row.id,
          customerId: row.customerId,
          issuedOn: row.issuedOn,
          lineId: row.lines[0]!.id,
          lineQtyMajor: row.lines[0]!.quantity.toString(),
        }));

      console.log(
        `  loaded ${customers.length} customers, ${products.length} products, ${postedInvoices.length} posted invoices`
      );
      if (customers.length === 0 || products.length === 0) {
        throw new Error("Extend mode requires existing SEED customers and products.");
      }
    }

    await ensureChartOfAccounts({
      tenantId,
      accountRepository: accounts,
    });

    const tracked = products.filter((p) => p.tracksInventory);

    if (!extendOnly) {
      const quotationStatuses = ["DRAFT", "SENT", "ACCEPTED", "CANCELLED"] as const;
      for (let i = 1; i <= QUOTATION_COUNT; i++) {
        const customer = pick(rng, customers);
        const lineCount = intBetween(rng, 1, 3);
        const lineProducts = Array.from({ length: lineCount }, () => pick(rng, products));
        const uniqueProducts = [...new Map(lineProducts.map((p) => [p.id, p])).values()];
        const issued = issuedOnForIndex(i);
        const quotation = await prisma.$transaction(async (tx) =>
          createQuotation({
            tenantId,
            actorUserId,
            fields: {
              customerId: customer.id,
              issuedOn: businessDate(issued),
              validUntil: businessDate(addDays(issued, 30)),
              placeOfSupplyStateCode: customer.placeOfSupplyStateCode,
              notes: `${SEED_PREFIX}quotation notes ${i}`,
              lines: uniqueProducts.map((p) => ({
                productId: p.id,
                quantity: quantityFromMajor(String(intBetween(rng, 1, 5))),
                discount: money(0n),
              })),
            },
            taxContext,
            sales: createPrismaSalesRepository(tx),
            parties: createPrismaPartyRepository(tx),
            catalog: createPrismaCatalogRepository(tx),
            taxRates,
            hsnSac,
            audit: createPrismaAuditRepository(tx),
            outbox: createPrismaOutboxRepository(tx),
          })
        );

        const target = quotationStatuses[(i - 1) % quotationStatuses.length]!;
        const statusDeps = {
          tenantId,
          actorUserId,
          quotationId: quotation.id,
          sales,
          audit,
          outbox,
        };
        if (target === "SENT") {
          await sendQuotation(statusDeps);
        } else if (target === "ACCEPTED") {
          await sendQuotation(statusDeps);
          await acceptQuotation(statusDeps);
        } else if (target === "CANCELLED") {
          await cancelQuotation(statusDeps);
        }

        if (i % 25 === 0) console.log(`  quotations ${i}/${QUOTATION_COUNT}`);
      }
    }

    const orderStatuses = ["DRAFT", "CONFIRMED", "CANCELLED"] as const;
    const existingOrderCount = await prisma.salesOrder.count({
      where: { tenantId, notes: { startsWith: SEED_PREFIX } },
    });
    let salesOrderCreated = 0;
    if (existingOrderCount > 0) {
      console.log(`  skipping sales orders (already ${existingOrderCount})`);
      salesOrderCreated = existingOrderCount;
    } else {
      for (let i = 1; i <= SALES_ORDER_COUNT; i++) {
        const customer = pick(rng, customers);
        const lineCount = intBetween(rng, 1, 3);
        const lineProducts = Array.from({ length: lineCount }, () => pick(rng, products));
        const uniqueProducts = [...new Map(lineProducts.map((p) => [p.id, p])).values()];
        const issued = issuedOnForIndex(i + 1);
        const order = await prisma.$transaction(async (tx) =>
          createSalesOrder({
            tenantId,
            actorUserId,
            fields: {
              customerId: customer.id,
              issuedOn: businessDate(issued),
              expectedOn: businessDate(addDays(issued, 14)),
              placeOfSupplyStateCode: customer.placeOfSupplyStateCode,
              notes: `${SEED_PREFIX}sales-order notes ${i}`,
              lines: uniqueProducts.map((p) => ({
                productId: p.id,
                quantity: quantityFromMajor(String(intBetween(rng, 1, 5))),
                discount: money(0n),
              })),
            },
            taxContext,
            sales: createPrismaSalesRepository(tx),
            parties: createPrismaPartyRepository(tx),
            catalog: createPrismaCatalogRepository(tx),
            taxRates,
            hsnSac,
            audit: createPrismaAuditRepository(tx),
            outbox: createPrismaOutboxRepository(tx),
          })
        );

        const target = orderStatuses[(i - 1) % orderStatuses.length]!;
        const statusDeps = {
          tenantId,
          actorUserId,
          salesOrderId: order.id,
          sales,
          audit,
          outbox,
        };
        if (target === "CONFIRMED") {
          await confirmSalesOrder(statusDeps);
        } else if (target === "CANCELLED") {
          await cancelSalesOrder(statusDeps);
        }

        salesOrderCreated = i;
        if (i % 25 === 0) console.log(`  sales orders ${i}/${SALES_ORDER_COUNT}`);
      }
    }

    if (!extendOnly) {
      let postedCount = 0;
      for (let i = 1; i <= INVOICE_COUNT; i++) {
        const customer = pick(rng, customers);
        const lineCount = intBetween(rng, 1, 4);
        const shouldPost = i <= Math.floor(INVOICE_COUNT * POST_INVOICE_RATIO);
        const lineCandidates = shouldPost
          ? products.filter((p) => !p.tracksInventory || tracked.some((t) => t.id === p.id))
          : products;
        const pool = lineCandidates.length > 0 ? lineCandidates : products;
        const lineProducts = Array.from({ length: lineCount }, () => pick(rng, pool));
        const uniqueProducts = [...new Map(lineProducts.map((p) => [p.id, p])).values()];

        const issued = issuedOnForIndex(i + 3);
        const dueDays = i % 3 === 0 ? 7 : 30;
        const dueOn = addDays(issued, dueDays);

        const invoice = await prisma.$transaction(async (tx) =>
          createInvoice({
            tenantId,
            actorUserId,
            fields: {
              customerId: customer.id,
              issuedOn: businessDate(issued),
              dueOn: businessDate(dueOn),
              placeOfSupplyStateCode: customer.placeOfSupplyStateCode,
              notes: `${SEED_PREFIX}invoice notes ${i}`,
              lines: uniqueProducts.map((p) => ({
                productId: p.id,
                quantity: quantityFromMajor(String(intBetween(rng, 1, 3))),
                discount: money(0n),
              })),
            },
            taxContext,
            sales: createPrismaSalesRepository(tx),
            parties: createPrismaPartyRepository(tx),
            catalog: createPrismaCatalogRepository(tx),
            taxRates,
            hsnSac,
            audit: createPrismaAuditRepository(tx),
            outbox: createPrismaOutboxRepository(tx),
          })
        );

        if (shouldPost) {
          const posted = await prisma.$transaction(async (tx) =>
            postInvoice({
              tenantId,
              actorUserId,
              invoiceId: invoice.id,
              taxContext,
              closedThroughPeriodKey: business.closedThroughPeriodKey,
              sales: createPrismaSalesRepository(tx),
              parties: createPrismaPartyRepository(tx),
              catalog: createPrismaCatalogRepository(tx),
              taxRates,
              hsnSac,
              inventory: createPrismaInventoryRepository(tx),
              accounts: createPrismaAccountRepository(tx),
              journals: createPrismaJournalRepository(tx),
              audit: createPrismaAuditRepository(tx),
              outbox: createPrismaOutboxRepository(tx),
            })
          );
          postedCount += 1;
          const firstLine = posted.lines[0];
          if (firstLine) {
            postedInvoices.push({
              id: posted.id,
              customerId: posted.customerId,
              issuedOn: posted.issuedOn,
              lineId: firstLine.id,
              lineQtyMajor: toQuantityMajorString(firstLine.quantity),
            });
          }
        }

        if (i % 25 === 0) {
          console.log(`  invoices ${i}/${INVOICE_COUNT} (posted ${postedCount})`);
        }
      }
    }

    let creditPostedCount = 0;
    let creditCreated = 0;
    const existingCreditCount = await prisma.creditNote.count({
      where: { tenantId, notes: { startsWith: SEED_PREFIX } },
    });
    const creditTargets = postedInvoices.slice(0, CREDIT_NOTE_COUNT);
    if (existingCreditCount > 0) {
      console.log(`  skipping credit notes (already ${existingCreditCount})`);
      creditCreated = existingCreditCount;
    } else {
      for (let i = 0; i < creditTargets.length; i++) {
        const inv = creditTargets[i]!;
        const shouldPost = i < Math.floor(creditTargets.length * POST_CREDIT_NOTE_RATIO);
        const issued = addDays(inv.issuedOn, 2);
        const creditNote = await prisma.$transaction(async (tx) =>
          createCreditNote({
            tenantId,
            actorUserId,
            fields: {
              invoiceId: inv.id,
              issuedOn: businessDate(issued),
              notes: `${SEED_PREFIX}credit-note notes ${i + 1}`,
              lines: [
                {
                  invoiceLineId: inv.lineId,
                  quantity: quantityFromMajor(creditQtyMajor(inv.lineQtyMajor)),
                },
              ],
            },
            taxContext,
            sales: createPrismaSalesRepository(tx),
            parties: createPrismaPartyRepository(tx),
            catalog: createPrismaCatalogRepository(tx),
            taxRates,
            hsnSac,
            audit: createPrismaAuditRepository(tx),
            outbox: createPrismaOutboxRepository(tx),
          })
        );

        if (shouldPost) {
          await prisma.$transaction(async (tx) =>
            postCreditNote({
              tenantId,
              actorUserId,
              creditNoteId: creditNote.id,
              taxContext,
              closedThroughPeriodKey: business.closedThroughPeriodKey,
              sales: createPrismaSalesRepository(tx),
              parties: createPrismaPartyRepository(tx),
              catalog: createPrismaCatalogRepository(tx),
              taxRates,
              hsnSac,
              inventory: createPrismaInventoryRepository(tx),
              accounts: createPrismaAccountRepository(tx),
              journals: createPrismaJournalRepository(tx),
              payments: createPrismaPaymentRepository(tx),
              audit: createPrismaAuditRepository(tx),
              outbox: createPrismaOutboxRepository(tx),
            })
          );
          creditPostedCount += 1;
        }

        creditCreated = i + 1;
        if ((i + 1) % 10 === 0) {
          console.log(`  credit notes ${i + 1}/${creditTargets.length} (posted ${creditPostedCount})`);
        }
      }
    }

    let paymentCount = 0;
    const existingPaymentCount = await prisma.customerPayment.count({
      where: { tenantId, notes: { startsWith: SEED_PREFIX } },
    });
    if (existingPaymentCount > 0) {
      console.log(`  skipping customer payments (already ${existingPaymentCount})`);
      paymentCount = existingPaymentCount;
    } else {
      for (const inv of postedInvoices) {
        if (paymentCount >= CUSTOMER_PAYMENT_COUNT) break;
        const outstanding = await getInvoiceOutstanding({
          tenantId,
          invoiceId: inv.id,
          sales,
          payments,
        });
        if (!outstanding || outstanding.outstanding.amountMinor <= 0n) continue;

        const payMinor =
          outstanding.outstanding.amountMinor > 200n
            ? outstanding.outstanding.amountMinor / 2n
            : outstanding.outstanding.amountMinor;
        const amount = money(payMinor);
        await prisma.$transaction(async (tx) =>
          recordCustomerPayment({
            tenantId,
            actorUserId,
            fields: {
              customerId: inv.customerId,
              receivedOn: businessDate(addDays(inv.issuedOn, 5)),
              method: pick(rng, PAYMENT_METHODS),
              amount,
              reference: `${SEED_PREFIX}RCP-${pad(paymentCount + 1, 3)}`,
              notes: `${SEED_PREFIX}payment notes ${paymentCount + 1}`,
              allocations: [{ invoiceId: inv.id, amount }],
            },
            financialYearStartMonth: business.financialYearStartMonth,
            closedThroughPeriodKey: business.closedThroughPeriodKey,
            payments: createPrismaPaymentRepository(tx),
            sales: createPrismaSalesRepository(tx),
            parties: createPrismaPartyRepository(tx),
            accounts: createPrismaAccountRepository(tx),
            journals: createPrismaJournalRepository(tx),
            audit: createPrismaAuditRepository(tx),
            outbox: createPrismaOutboxRepository(tx),
          })
        );
        paymentCount += 1;
        if (paymentCount % 10 === 0) {
          console.log(`  customer payments ${paymentCount}/${CUSTOMER_PAYMENT_COUNT}`);
        }
      }
    }

    const suppliers: Array<{ id: string; placeOfSupplyStateCode: string }> = [];
    const existingSuppliers = await prisma.party.findMany({
      where: { tenantId, kind: "SUPPLIER", name: { startsWith: SEED_PREFIX } },
      select: { id: true, state: true },
      orderBy: { name: "asc" },
    });
    if (existingSuppliers.length > 0) {
      for (const row of existingSuppliers) {
        suppliers.push({
          id: row.id,
          placeOfSupplyStateCode: stateCodeFromName(row.state),
        });
      }
      console.log(`  using ${suppliers.length} existing SEED suppliers`);
    } else {
      for (let i = 1; i <= SUPPLIER_COUNT; i++) {
        const region = pick(rng, STATE_POOL);
        const registered = i % 5 < 2;
        const supplier = await createSupplier({
          tenantId,
          actorUserId,
          fields: {
            name: `${SEED_PREFIX}Supplier-${pad(i, 3)}`,
            phone: `97${pad(1_000_000 + i, 8)}`,
            email: `seed.supplier${pad(i, 3)}@example.test`,
            billingAddressLine1: `${i} Supplier Lane`,
            city: region.city,
            state: region.name,
            postalCode: region.pin,
            country: "IN",
            gstRegistrationStatus: registered ? "REGISTERED" : "NOT_REGISTERED",
            gstin: registered ? dummyGstin(region.code, 500 + i) : null,
          },
          parties: createPrismaPartyRepository(prisma),
          audit,
          outbox,
        });
        suppliers.push({
          id: supplier.id,
          placeOfSupplyStateCode: region.code,
        });
        if (i % 25 === 0) console.log(`  suppliers ${i}/${SUPPLIER_COUNT}`);
      }
    }

    const goodsProducts = products.filter((p) => p.kind === "PRODUCT");
    const purchasePool = goodsProducts.length > 0 ? goodsProducts : products;
    type PostedPurchaseSeed = {
      id: string;
      supplierId: string;
      issuedOn: string;
      lineId: string;
      lineQtyMajor: string;
    };
    const postedPurchases: PostedPurchaseSeed[] = [];
    let purchasePostedCount = 0;

    const existingPurchases = await prisma.purchase.count({
      where: { tenantId, notes: { startsWith: SEED_PREFIX } },
    });
    if (existingPurchases > 0) {
      console.log(`  skipping purchases (SEED purchases already present: ${existingPurchases})`);
      const purchaseRows = await prisma.purchase.findMany({
        where: {
          tenantId,
          notes: { startsWith: SEED_PREFIX },
          status: { in: ["POSTED", "UNPAID", "PARTIALLY_PAID", "PAID"] },
        },
        select: {
          id: true,
          supplierId: true,
          issuedOn: true,
          lines: { select: { id: true, quantity: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        },
        orderBy: { number: "asc" },
      });
      for (const row of purchaseRows) {
        if (!row.lines[0]) continue;
        postedPurchases.push({
          id: row.id,
          supplierId: row.supplierId,
          issuedOn: row.issuedOn,
          lineId: row.lines[0].id,
          lineQtyMajor: row.lines[0].quantity.toString(),
        });
      }
      purchasePostedCount = postedPurchases.length;
    } else {
      for (let i = 1; i <= PURCHASE_COUNT; i++) {
        const supplier = pick(rng, suppliers);
        const lineCount = intBetween(rng, 1, 3);
        const shouldPost = i <= Math.floor(PURCHASE_COUNT * POST_PURCHASE_RATIO);
        const lineProducts = Array.from({ length: lineCount }, () => pick(rng, purchasePool));
        const uniqueProducts = [...new Map(lineProducts.map((p) => [p.id, p])).values()];
        const issued = issuedOnForIndex(i + 7);
        const dueOn = addDays(issued, i % 2 === 0 ? 15 : 30);

        const purchase = await prisma.$transaction(async (tx) =>
          createPurchase({
            tenantId,
            actorUserId,
            fields: {
              supplierId: supplier.id,
              issuedOn: businessDate(issued),
              dueOn: businessDate(dueOn),
              placeOfSupplyStateCode: supplier.placeOfSupplyStateCode,
              notes: `${SEED_PREFIX}purchase notes ${i}`,
              lines: uniqueProducts.map((p) => ({
                productId: p.id,
                quantity: quantityFromMajor(String(intBetween(rng, 1, 5))),
                discount: money(0n),
              })),
            },
            taxContext,
            purchases: createPrismaPurchasesRepository(tx),
            parties: createPrismaPartyRepository(tx),
            catalog: createPrismaCatalogRepository(tx),
            taxRates,
            hsnSac,
            audit: createPrismaAuditRepository(tx),
            outbox: createPrismaOutboxRepository(tx),
          })
        );

        if (shouldPost) {
          const posted = await prisma.$transaction(async (tx) =>
            postPurchase({
              tenantId,
              actorUserId,
              purchaseId: purchase.id,
              taxContext,
              closedThroughPeriodKey: business.closedThroughPeriodKey,
              purchases: createPrismaPurchasesRepository(tx),
              parties: createPrismaPartyRepository(tx),
              catalog: createPrismaCatalogRepository(tx),
              taxRates,
              hsnSac,
              inventory: createPrismaInventoryRepository(tx),
              accounts: createPrismaAccountRepository(tx),
              journals: createPrismaJournalRepository(tx),
              audit: createPrismaAuditRepository(tx),
              outbox: createPrismaOutboxRepository(tx),
            })
          );
          purchasePostedCount += 1;
          const firstLine = posted.lines[0];
          if (firstLine) {
            postedPurchases.push({
              id: posted.id,
              supplierId: posted.supplierId,
              issuedOn: posted.issuedOn,
              lineId: firstLine.id,
              lineQtyMajor: toQuantityMajorString(firstLine.quantity),
            });
          }
        }

        if (i % 25 === 0) {
          console.log(`  purchases ${i}/${PURCHASE_COUNT} (posted ${purchasePostedCount})`);
        }
      }
    }

    let purchaseReturnPosted = 0;
    let purchaseReturnCreated = 0;
    const existingReturnCount = await prisma.purchaseReturn.count({
      where: { tenantId, notes: { startsWith: SEED_PREFIX } },
    });
    const returnTargets = postedPurchases.slice(0, PURCHASE_RETURN_COUNT);
    if (existingReturnCount > 0) {
      console.log(`  skipping purchase returns (already ${existingReturnCount})`);
      purchaseReturnCreated = existingReturnCount;
    } else {
      for (let i = 0; i < returnTargets.length; i++) {
        const bill = returnTargets[i]!;
        const shouldPost = i < Math.floor(returnTargets.length * POST_PURCHASE_RETURN_RATIO);
        const pr = await prisma.$transaction(async (tx) =>
          createPurchaseReturn({
            tenantId,
            actorUserId,
            fields: {
              purchaseId: bill.id,
              issuedOn: businessDate(addDays(bill.issuedOn, 3)),
              notes: `${SEED_PREFIX}purchase-return notes ${i + 1}`,
              lines: [
                {
                  purchaseLineId: bill.lineId,
                  quantity: quantityFromMajor(creditQtyMajor(bill.lineQtyMajor)),
                },
              ],
            },
            taxContext,
            purchases: createPrismaPurchasesRepository(tx),
            parties: createPrismaPartyRepository(tx),
            catalog: createPrismaCatalogRepository(tx),
            taxRates,
            hsnSac,
            audit: createPrismaAuditRepository(tx),
            outbox: createPrismaOutboxRepository(tx),
          })
        );

        if (shouldPost) {
          await prisma.$transaction(async (tx) =>
            postPurchaseReturn({
              tenantId,
              actorUserId,
              purchaseReturnId: pr.id,
              taxContext,
              closedThroughPeriodKey: business.closedThroughPeriodKey,
              purchases: createPrismaPurchasesRepository(tx),
              parties: createPrismaPartyRepository(tx),
              catalog: createPrismaCatalogRepository(tx),
              taxRates,
              hsnSac,
              inventory: createPrismaInventoryRepository(tx),
              accounts: createPrismaAccountRepository(tx),
              journals: createPrismaJournalRepository(tx),
              supplierPayments: createPrismaSupplierPaymentRepository(tx),
              audit: createPrismaAuditRepository(tx),
              outbox: createPrismaOutboxRepository(tx),
            })
          );
          purchaseReturnPosted += 1;
        }
        purchaseReturnCreated = i + 1;
      }
      if (returnTargets.length > 0) {
        console.log(
          `  purchase returns ${returnTargets.length} (posted ${purchaseReturnPosted})`
        );
      }
    }

    let supplierPaymentCount = 0;
    const existingSupplierPaymentCount = await prisma.supplierPayment.count({
      where: { tenantId, notes: { startsWith: SEED_PREFIX } },
    });
    if (existingSupplierPaymentCount > 0) {
      console.log(`  skipping supplier payments (already ${existingSupplierPaymentCount})`);
      supplierPaymentCount = existingSupplierPaymentCount;
    } else {
      for (const bill of postedPurchases) {
        if (supplierPaymentCount >= SUPPLIER_PAYMENT_COUNT) break;
        const outstanding = await getPurchaseOutstanding({
          tenantId,
          purchaseId: bill.id,
          purchases: purchasesRepo,
          supplierPayments,
        });
        if (!outstanding || outstanding.outstanding.amountMinor <= 0n) continue;

        const payMinor =
          outstanding.outstanding.amountMinor > 200n
            ? outstanding.outstanding.amountMinor / 2n
            : outstanding.outstanding.amountMinor;
        const amount = money(payMinor);
        await prisma.$transaction(async (tx) =>
          recordSupplierPayment({
            tenantId,
            actorUserId,
            fields: {
              supplierId: bill.supplierId,
              paidOn: businessDate(addDays(bill.issuedOn, 5)),
              method: pick(rng, PAYMENT_METHODS),
              amount,
              reference: `${SEED_PREFIX}SP-${pad(supplierPaymentCount + 1, 3)}`,
              notes: `${SEED_PREFIX}supplier-payment notes ${supplierPaymentCount + 1}`,
              allocations: [{ purchaseId: bill.id, amount }],
            },
            financialYearStartMonth: business.financialYearStartMonth,
            closedThroughPeriodKey: business.closedThroughPeriodKey,
            supplierPayments: createPrismaSupplierPaymentRepository(tx),
            purchases: createPrismaPurchasesRepository(tx),
            parties: createPrismaPartyRepository(tx),
            accounts: createPrismaAccountRepository(tx),
            journals: createPrismaJournalRepository(tx),
            audit: createPrismaAuditRepository(tx),
            outbox: createPrismaOutboxRepository(tx),
          })
        );
        supplierPaymentCount += 1;
      }
      if (supplierPaymentCount > 0) {
        console.log(`  supplier payments ${supplierPaymentCount}`);
      }
    }

    console.log("Seed complete:");
    if (!extendOnly) {
      console.log(`  customers:        ${CUSTOMER_COUNT}`);
      console.log(`  products:         ${PRODUCT_COUNT}`);
      console.log(`  openingStock:     ${stockCount}`);
      console.log(`  quotations:       ${QUOTATION_COUNT}`);
      console.log(`  invoices:         ${INVOICE_COUNT} (posted pool ${postedInvoices.length})`);
    } else {
      console.log(`  mode:             fill-gaps`);
      console.log(`  customers(reuse): ${customers.length}`);
      console.log(`  products(reuse):  ${products.length}`);
      console.log(`  invoices(reuse):  ${postedInvoices.length} posted`);
    }
    console.log(`  salesOrders:      ${salesOrderCreated}`);
    console.log(`  creditNotes:      ${creditCreated} (posted ${creditPostedCount})`);
    console.log(`  customerPayments: ${paymentCount}`);
    console.log(`  suppliers:        ${suppliers.length}`);
    console.log(
      `  purchases:        ${existingPurchases > 0 ? existingPurchases : PURCHASE_COUNT} (posted ${purchasePostedCount})`
    );
    console.log(
      `  purchaseReturns:  ${purchaseReturnCreated} (posted ${purchaseReturnPosted})`
    );
    console.log(`  supplierPayments: ${supplierPaymentCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

describe("volume demo dataset seed", () => {
  it(
    "seeds volume dataset (full or extend)",
    async () => {
      await seedVolumeDataset();
      expect(true).toBe(true);
    },
    20 * 60 * 1000
  );
});
