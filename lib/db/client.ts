import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
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
        salesInvoice?: { findMany?: unknown };
        customerPayment?: { findMany?: unknown };
        expense?: { findMany?: unknown };
        purchase?: { findMany?: unknown };
        supplierPayment?: { findMany?: unknown };
        notification?: { findMany?: unknown };
      }
    | undefined;
  return (
    typeof candidate?.document?.findMany === "function" &&
    typeof candidate?.party?.findMany === "function" &&
    typeof candidate?.product?.findMany === "function" &&
    typeof candidate?.inventoryMovement?.findMany === "function" &&
    typeof candidate?.quotation?.findMany === "function" &&
    typeof candidate?.salesInvoice?.findMany === "function" &&
    typeof candidate?.customerPayment?.findMany === "function" &&
    typeof candidate?.expense?.findMany === "function" &&
    typeof candidate?.purchase?.findMany === "function" &&
    typeof candidate?.supplierPayment?.findMany === "function" &&
    typeof candidate?.notification?.findMany === "function"
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
