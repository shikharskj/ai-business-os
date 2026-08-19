import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

function hasDocumentDelegate(client: PrismaClient | undefined): boolean {
  return typeof (client as { document?: { findMany?: unknown } } | undefined)
    ?.document?.findMany === "function";
}

const existingGlobalClient = globalForPrisma.prisma;
if (existingGlobalClient && !hasDocumentDelegate(existingGlobalClient)) {
  void existingGlobalClient.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
