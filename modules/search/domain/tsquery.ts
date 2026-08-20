/**
 * Build a safe PostgreSQL `simple` tsquery for prefix matching.
 * Returns null when the query has no usable tokens.
 */
export function buildPrefixTsQuery(raw: string): string | null {
  const tokens = raw
    .trim()
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter((token) => token.length > 0)
    .slice(0, 8);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.map((token) => `${token}:*`).join(" & ");
}
