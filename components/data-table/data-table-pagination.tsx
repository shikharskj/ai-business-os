"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
} from "@/modules/shared-kernel/list-page";

type DataTablePaginationProps = {
  total: number;
  page: number;
  pageSize: PageSize;
  selectedCount?: number;
  buildHref: (updates: { page?: number; pageSize?: PageSize }) => string;
};

export function DataTablePagination({
  total,
  page,
  pageSize,
  selectedCount = 0,
  buildHref,
}: DataTablePaginationProps) {
  const count = total <= 0 ? 0 : Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(page * pageSize, total);
  const rowLabel =
    selectedCount > 0
      ? `${selectedCount} of ${total} row(s) selected.`
      : `${from}-${to} of ${total} row(s)`;

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{rowLabel}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium whitespace-nowrap">Rows per page</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            defaultValue={String(pageSize)}
            onChange={(event) => {
              window.location.href = buildHref({
                pageSize: Number(event.target.value) as PageSize,
              });
            }}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={buildHref({ page: 1 })} aria-label="First page" />}
            disabled={page <= 1}
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={
              <Link href={buildHref({ page: page - 1 })} aria-label="Previous page" />
            }
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-24 text-center text-sm font-medium">
            Page {page} of {Math.max(count, 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={buildHref({ page: page + 1 })} aria-label="Next page" />}
            disabled={count === 0 || page >= count}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={buildHref({ page: count })} aria-label="Last page" />}
            disabled={count === 0 || page >= count}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
