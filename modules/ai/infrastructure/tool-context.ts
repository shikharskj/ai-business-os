import "server-only";

import { prisma } from "@/lib/db";
import { requireCurrentTenant } from "@/lib/tenant";
import type { AiToolContext } from "@/modules/ai/domain/tool-types";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { createPrismaNotificationRepository } from "@/modules/notifications";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { prismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";

/**
 * Builds the only context an AI tool may execute with.
 *
 * Identity, tenant, role, and business configuration come from the
 * authenticated Clerk session and tenant membership — never from the model or
 * the request body. Unauthenticated or tenant-less callers fail closed here,
 * before any tool is reachable.
 */
export async function createAiToolContext(options?: {
  correlationId?: string;
}): Promise<AiToolContext> {
  const tenant = await requireCurrentTenant();

  return {
    tenantId: tenant.tenantId,
    actorUserId: tenant.membership.userId,
    role: tenant.membership.role,
    timezone: tenant.business.timezone,
    currency: tenant.business.currency,
    lowStockThresholdMajor: tenant.business.lowStockThreshold,
    repositories: {
      sales: prismaSalesRepository,
      purchases: prismaPurchasesRepository,
      expenses: prismaExpenseRepository,
      payments: prismaPaymentRepository,
      supplierPayments: prismaSupplierPaymentRepository,
      catalog: prismaCatalogRepository,
      inventory: prismaInventoryRepository,
      party: prismaPartyRepository,
      notifications: createPrismaNotificationRepository(prisma),
    },
    audit: createPrismaAuditRepository(prisma),
    correlationId: options?.correlationId,
  };
}
