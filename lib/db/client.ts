import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Neon serverless + pooled URL: keep per-instance pool small to avoid storms. */
const SERVERLESS_POOL_MAX = 3;

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: SERVERLESS_POOL_MAX,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter, errorFormat: "pretty" });
}

function hasCurrentDelegates(client: PrismaClient | undefined): boolean {
  const candidate = client as
    | {
        document?: { findMany?: unknown };
        party?: { findMany?: unknown };
        product?: { findMany?: unknown };
        inventoryMovement?: { findMany?: unknown };
        quotation?: { findMany?: unknown };
        salesOrder?: { findMany?: unknown };
        salesInvoice?: { findMany?: unknown };
        creditNote?: { findMany?: unknown };
        customerPayment?: { findMany?: unknown };
        expense?: { findMany?: unknown };
        purchase?: { findMany?: unknown };
        purchaseReturn?: { findMany?: unknown };
        supplierPayment?: { findMany?: unknown };
        notification?: { findMany?: unknown };
        tenantAutonomyPolicy?: { findUnique?: unknown };
        workflowRun?: { findMany?: unknown };
      }
    | undefined;
  return (
    typeof candidate?.document?.findMany === "function" &&
    typeof candidate?.party?.findMany === "function" &&
    typeof candidate?.product?.findMany === "function" &&
    typeof candidate?.inventoryMovement?.findMany === "function" &&
    typeof candidate?.quotation?.findMany === "function" &&
    typeof candidate?.salesOrder?.findMany === "function" &&
    typeof candidate?.salesInvoice?.findMany === "function" &&
    typeof candidate?.creditNote?.findMany === "function" &&
    typeof candidate?.customerPayment?.findMany === "function" &&
    typeof candidate?.expense?.findMany === "function" &&
    typeof candidate?.purchase?.findMany === "function" &&
    typeof candidate?.purchaseReturn?.findMany === "function" &&
    typeof candidate?.supplierPayment?.findMany === "function" &&
    typeof candidate?.notification?.findMany === "function" &&
    typeof candidate?.tenantAutonomyPolicy?.findUnique === "function" &&
    typeof candidate?.workflowRun?.findMany === "function"
  );
}

const existingGlobalClient = globalForPrisma.prisma;
if (existingGlobalClient && !hasCurrentDelegates(existingGlobalClient)) {
  void existingGlobalClient.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
