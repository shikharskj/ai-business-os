import type {
  SearchFilter,
  SearchResult,
} from "@/modules/search/domain/types";

export type SearchRepository = {
  search(filter: SearchFilter): Promise<SearchResult[]>;
};
