import "server-only";

import type { ApplicationUserStore } from "@/lib/auth/application-user-store";
import { prisma } from "@/lib/db";

function deletedClerkUserId(userId: string): string {
  return `deleted_${userId}`;
}

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

  /**
   * Clerk user.deleted: revoke memberships; hard-delete only when safe.
   * If the user owns a Business or has Restrict FKs (e.g. uploaded documents),
   * anonymize clerkUserId to a unique tombstone and leave the row.
   */
  async deleteByClerkUserId(clerkUserId) {
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        ownedBusinesses: { select: { id: true }, take: 1 },
        uploadedDocuments: { select: { id: true }, take: 1 },
      },
    });

    if (!user) {
      return;
    }

    await prisma.membership.updateMany({
      where: { userId: user.id, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });

    const blockedByFk =
      user.ownedBusinesses.length > 0 || user.uploadedDocuments.length > 0;

    if (blockedByFk) {
      await prisma.user.update({
        where: { id: user.id },
        data: { clerkUserId: deletedClerkUserId(user.id) },
      });
      return;
    }

    try {
      await prisma.user.delete({ where: { id: user.id } });
    } catch (error) {
      console.warn(
        "user.deleted: hard delete blocked by FK; anonymizing clerkUserId",
        { userId: user.id, error }
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { clerkUserId: deletedClerkUserId(user.id) },
      });
    }
  },
};
