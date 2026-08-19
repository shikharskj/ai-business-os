import "server-only";

import type { ApplicationUserStore } from "@/lib/auth/application-user-store";
import { prisma } from "@/lib/db";

export const prismaApplicationUserStore: ApplicationUserStore = {
  async upsertByClerkUserId(clerkUserId) {
    return prisma.user.upsert({
      where: { clerkUserId },
      create: { clerkUserId },
      update: {},
      select: {
        id: true,
        clerkUserId: true,
      },
    });
  },

  async deleteByClerkUserId(clerkUserId) {
    await prisma.user.deleteMany({
      where: { clerkUserId },
    });
  },
};
