import {
  rebuildBusinessStateProjections,
  type RebuildBusinessStateDeps,
} from "@/modules/business-state/application/rebuild";

/** Rebuild AttentionQueue when meta was never stamped or is older than this. */
export const ATTENTION_QUEUE_FRESH_TTL_MS = 6 * 60 * 60 * 1000;

export type EnsureAttentionQueueFreshInput = Omit<
  RebuildBusinessStateDeps,
  "families" | "markRebuilt"
> & {
  now?: Date;
};

/**
 * Backfills AttentionQueue when BusinessState meta has never been stamped
 * (`rebuiltAt` null/missing) or is older than {@link ATTENTION_QUEUE_FRESH_TTL_MS}.
 * Day-to-day freshness still stays on outbox + overdue scan.
 */
export async function ensureAttentionQueueFresh(
  input: EnsureAttentionQueueFreshInput
): Promise<{ rebuilt: boolean }> {
  const now = input.now ?? new Date();
  const meta = await input.projections.getMeta(input.tenantId);
  const rebuiltAt = meta?.rebuiltAt ?? null;
  const isFresh =
    rebuiltAt !== null &&
    now.getTime() - rebuiltAt.getTime() < ATTENTION_QUEUE_FRESH_TTL_MS;
  if (isFresh) {
    return { rebuilt: false };
  }

  await rebuildBusinessStateProjections({
    ...input,
    families: ["attentionQueue"],
    markRebuilt: true,
  });
  return { rebuilt: true };
}
