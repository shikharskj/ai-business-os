import type { MembershipRole } from "@/modules/tenant/domain/types";
import { roleHasPermission } from "@/lib/security/permissions";
import { SearchError } from "@/modules/search/domain/errors";
import type { SearchRepository } from "@/modules/search/domain/search-repository";
import {
  SEARCH_ENTITY_PERMISSION,
  SEARCH_ENTITY_TYPES,
  type SearchEntityType,
  type SearchResponse,
} from "@/modules/search/domain/types";
import type { BusinessDate } from "@/modules/shared-kernel/dates";

function allowedTypesForRole(role: MembershipRole): SearchEntityType[] {
  return SEARCH_ENTITY_TYPES.filter((type) =>
    roleHasPermission(role, SEARCH_ENTITY_PERMISSION[type])
  );
}

export async function searchBusinessRecords(input: {
  tenantId: string;
  role: MembershipRole;
  query: string;
  type?: SearchEntityType;
  status?: string;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
  limit?: number;
  search: SearchRepository;
}): Promise<SearchResponse> {
  const trimmed = input.query.trim();
  if (!trimmed) {
    throw new SearchError("Search query is required.");
  }

  const allowed = allowedTypesForRole(input.role);
  if (allowed.length === 0) {
    return { query: trimmed, results: [], total: 0 };
  }

  let types: SearchEntityType[] = allowed;
  if (input.type) {
    if (!allowed.includes(input.type)) {
      return { query: trimmed, results: [], total: 0 };
    }
    types = [input.type];
  }

  if (input.fromDate && input.toDate && input.fromDate > input.toDate) {
    throw new SearchError("From date must be on or before to date.");
  }

  const results = await input.search.search({
    tenantId: input.tenantId,
    query: trimmed,
    types,
    status: input.status,
    fromDate: input.fromDate,
    toDate: input.toDate,
    limit: input.limit ?? 20,
  });

  return {
    query: trimmed,
    results,
    total: results.length,
  };
}
