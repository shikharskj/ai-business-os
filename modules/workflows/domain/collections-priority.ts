/**
 * Simple collections ranking: larger outstanding first, then more days overdue.
 * Amounts stay integer minor units — no float ranking.
 */

export type CollectionsCandidate = {
  invoiceId: string;
  outstandingMinor: bigint;
  daysOverdue: number;
};

export function rankCollectionsCandidates(
  rows: readonly CollectionsCandidate[]
): CollectionsCandidate[] {
  return [...rows].sort((a, b) => {
    if (a.outstandingMinor !== b.outstandingMinor) {
      return a.outstandingMinor > b.outstandingMinor ? -1 : 1;
    }
    if (b.daysOverdue !== a.daysOverdue) {
      return b.daysOverdue - a.daysOverdue;
    }
    return a.invoiceId.localeCompare(b.invoiceId);
  });
}

export function collectionsRankOf(
  ranked: readonly CollectionsCandidate[],
  invoiceId: string
): number | null {
  const index = ranked.findIndex((row) => row.invoiceId === invoiceId);
  return index === -1 ? null : index + 1;
}
