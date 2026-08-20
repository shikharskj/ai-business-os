import type { ReadonlyURLSearchParams } from "next/navigation";

import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
} from "@/modules/shared-kernel/list-page";

export function parseListTableParams(
  searchParams: Record<string, string | string[] | undefined>
) {
  const pageRaw = Array.isArray(searchParams.page)
    ? searchParams.page[0]
    : searchParams.page;
  const pageSizeRaw = Array.isArray(searchParams.pageSize)
    ? searchParams.pageSize[0]
    : searchParams.pageSize;

  const page = Math.max(1, Number(pageRaw ?? 1) || 1);
  const pageSizeCandidate = String(pageSizeRaw ?? "10");
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(
    Number(pageSizeCandidate)
  )
    ? (Number(pageSizeCandidate) as PageSize)
    : 10;

  return { page, pageSize };
}

export function buildListTableHref(
  pathname: string,
  current: URLSearchParams | ReadonlyURLSearchParams,
  updates: { page?: number; pageSize?: PageSize }
): string {
  const params = new URLSearchParams(current.toString());
  if (updates.page !== undefined) {
    if (updates.page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(updates.page));
    }
  }
  if (updates.pageSize !== undefined) {
    params.set("pageSize", String(updates.pageSize));
    params.delete("page");
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function pageCount(total: number, pageSize: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.ceil(total / pageSize);
}

export function toQueryString(
  params: Record<string, string | string[] | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, entry));
    } else if (value !== "") {
      search.set(key, value);
    }
  }
  return search.toString();
}
