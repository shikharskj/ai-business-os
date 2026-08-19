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

function hasCurrentDelegates(client: PrismaClient | undefined): boolean {
  const candidate = client as
    | { document?: { findMany?: unknown }; party?: { findMany?: unknown } }
    | undefined;
  return (
    typeof candidate?.document?.findMany === "function" &&
    typeof candidate?.party?.findMany === "function"
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
