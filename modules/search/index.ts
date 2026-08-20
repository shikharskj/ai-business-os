export type {
  SearchEntityType,
  SearchFilter,
  SearchResponse,
  SearchResult,
} from "@/modules/search/domain/types";
export {
  SEARCH_ENTITY_LABEL,
  SEARCH_ENTITY_PERMISSION,
  SEARCH_ENTITY_TYPES,
} from "@/modules/search/domain/types";
export { SearchError } from "@/modules/search/domain/errors";
export type { SearchRepository } from "@/modules/search/domain/search-repository";
export { buildPrefixTsQuery } from "@/modules/search/domain/tsquery";
export { searchBusinessRecords } from "@/modules/search/application/search";
export { createPrismaSearchRepository } from "@/modules/search/infrastructure/prisma-search-repository";
export { createMemorySearchRepository } from "@/modules/search/infrastructure/memory-search-repository";
export { searchQuerySchema } from "@/modules/search/schemas/search.schema";
