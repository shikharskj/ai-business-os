import type { PrismaClient } from "@/generated/prisma/client";

import { createPrismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { createPrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { createPrismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import {
  createPrismaAccountRepository,
  createPrismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { createPrismaBusinessStateProjectionRepository } from "@/modules/business-state/infrastructure/prisma-projection-repository";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";
import type { BusinessStateConsumerDeps } from "@/modules/business-state/consumers/business-state-consumer";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";

/**
 * Builds BusinessState outbox consumer deps against the shared Prisma client.
 */
export function createPrismaBusinessStateConsumerDeps(
  prisma: PrismaClient
): BusinessStateConsumerDeps {
  return {
    sales: createPrismaSalesRepository(prisma),
    payments: createPrismaPaymentRepository(prisma),
    catalog: createPrismaCatalogRepository(prisma),
    inventory: createPrismaInventoryRepository(prisma),
    accounts: createPrismaAccountRepository(prisma),
    journals: createPrismaJournalRepository(prisma),
    projections: createPrismaBusinessStateProjectionRepository(prisma),
    attention: createPrismaAttentionQueueRepository(prisma),
    outbox: createPrismaOutboxRepository(prisma),
    async resolveTenantContext(tenantId) {
      const business = await prisma.business.findUnique({
        where: { id: tenantId },
        select: {
          timezone: true,
          currency: true,
          lowStockThreshold: true,
        },
      });
      if (!business) return null;
      return {
        timezone: business.timezone,
        currency: business.currency,
        lowStockThresholdMajor: business.lowStockThreshold.toString(),
      };
    },
  };
}
