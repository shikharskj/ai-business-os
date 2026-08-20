import "server-only";

import { prisma } from "@/lib/db";
import {
  createPrismaListOrderRepository,
} from "@/modules/list-order/infrastructure/list-order-repository";

export const prismaListOrderRepository = createPrismaListOrderRepository(prisma);
