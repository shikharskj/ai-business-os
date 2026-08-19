export type ApplicationUser = {
  id: string;
  clerkUserId: string;
};

export type ApplicationUserStore = {
  upsertByClerkUserId(clerkUserId: string): Promise<ApplicationUser>;
  deleteByClerkUserId(clerkUserId: string): Promise<void>;
};

export function createMemoryApplicationUserStore(
  initialUsers: ApplicationUser[] = []
): ApplicationUserStore {
  const users = new Map(
    initialUsers.map((user) => [user.clerkUserId, user] as const)
  );

  return {
    async upsertByClerkUserId(clerkUserId) {
      const existing = users.get(clerkUserId);
      if (existing) {
        return existing;
      }

      const created = {
        id: crypto.randomUUID(),
        clerkUserId,
      };
      users.set(clerkUserId, created);
      return created;
    },

    async deleteByClerkUserId(clerkUserId) {
      users.delete(clerkUserId);
    },
  };
}
