"use client";

import { useCallback, useMemo } from "react";

import { buildListTableHref } from "@/lib/list-table-url";
import type { PageSize } from "@/modules/shared-kernel/list-page";

export function useListTableHref(pathname: string, queryString: string) {
  const current = useMemo(() => new URLSearchParams(queryString), [queryString]);
  return useCallback(
    (updates: { page?: number; pageSize?: PageSize }) =>
      buildListTableHref(pathname, current, updates),
    [current, pathname]
  );
}
