import "server-only";

import {
  type ApplicationUser,
  type ApplicationUserStore,
} from "@/lib/auth/application-user-store";
import { getClerkUserId } from "@/lib/auth/clerk";
import { AuthenticationError } from "@/lib/auth/errors";

async function getDefaultStore(): Promise<ApplicationUserStore> {
  const { prismaApplicationUserStore } = await import(
    "@/lib/auth/prisma-application-user-store"
  );
  return prismaApplicationUserStore;
}

export async function getCurrentUser(
  store?: ApplicationUserStore
): Promise<ApplicationUser | null> {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return null;
  }

  const userStore = store ?? (await getDefaultStore());
  return userStore.upsertByClerkUserId(clerkUserId);
}

export async function requireCurrentUser(
  store?: ApplicationUserStore
): Promise<ApplicationUser> {
  const user = await getCurrentUser(store);
  if (!user) {
    throw new AuthenticationError();
  }

  return user;
}
