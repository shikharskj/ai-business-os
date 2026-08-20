import type { SearchRepository } from "@/modules/search/domain/search-repository";
import { buildPrefixTsQuery } from "@/modules/search/domain/tsquery";
import type {
  SearchEntityType,
  SearchFilter,
  SearchResult,
} from "@/modules/search/domain/types";
import { businessDate } from "@/modules/shared-kernel/dates";

type MemoryDoc = {
  tenantId: string;
  entityType: SearchEntityType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  status: string | null;
  amountLabel: string | null;
  partyName: string | null;
  businessDate: string | null;
  searchText: string;
};

function matchesQuery(doc: MemoryDoc, query: string): boolean {
  const tokens =
    buildPrefixTsQuery(query)
      ?.split(" & ")
      .map((token) => token.replace(/:\*$/, "")) ?? [];
  if (tokens.length === 0) return false;
  const haystack = doc.searchText.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function createMemorySearchRepository(
  initial: MemoryDoc[] = []
): SearchRepository & { documents: MemoryDoc[] } {
  const documents = [...initial];

  return {
    documents,
    async search(filter: SearchFilter): Promise<SearchResult[]> {
      const types =
        filter.types && filter.types.length > 0
          ? new Set(filter.types)
          : null;
      const limit = filter.limit ?? 20;

      return documents
        .filter((doc) => doc.tenantId === filter.tenantId)
        .filter((doc) => (types ? types.has(doc.entityType) : true))
        .filter((doc) =>
          filter.status ? doc.status === filter.status : true
        )
        .filter((doc) => {
          if (!filter.fromDate) return true;
          if (!doc.businessDate) return true;
          return doc.businessDate >= filter.fromDate;
        })
        .filter((doc) => {
          if (!filter.toDate) return true;
          if (!doc.businessDate) return true;
          return doc.businessDate <= filter.toDate;
        })
        .filter((doc) => matchesQuery(doc, filter.query))
        .slice(0, limit)
        .map((doc, index) => ({
          id: doc.id,
          entityType: doc.entityType,
          title: doc.title,
          subtitle: doc.subtitle,
          href: doc.href,
          status: doc.status,
          amountLabel: doc.amountLabel,
          partyName: doc.partyName,
          businessDate: doc.businessDate
            ? businessDate(doc.businessDate)
            : null,
          rank: 1 - index * 0.01,
        }));
    },
  };
}
