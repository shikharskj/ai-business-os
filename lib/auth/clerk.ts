import "server-only";

import { auth } from "@clerk/nextjs/server";

export async function getClerkUserId(): Promise<string | null> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return null;
  }

  return userId;
}
