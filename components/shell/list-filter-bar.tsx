"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ListFilterBarProps = {
  hiddenFields?: ReactNode;
  search: ReactNode;
  filters: ReactNode;
  actions: ReactNode;
};

/**
 * GET list-filter form chrome: full-width search; secondary filters in a
 * collapsible panel below md, inline wrap on md+.
 * On mobile, Filter/Clear actions stay visible outside the closed details panel.
 */
export function ListFilterBar({
  hiddenFields,
  search,
  filters,
  actions,
}: ListFilterBarProps) {
  const isMobile = useIsMobile();

  return (
    <form method="get" className="flex flex-col gap-3">
      {hiddenFields}
      <div className="w-full min-w-0 [&_input]:max-w-none">{search}</div>
      {isMobile ? (
        <>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
          <details className="group rounded-md border border-border bg-background">
            <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-base font-medium outline-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-ring">
              Filters
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-3 border-t border-border p-3">
              {filters}
            </div>
          </details>
        </>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          {filters}
          {actions}
        </div>
      )}
    </form>
  );
}

export function ListFilterSearch({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
      {children}
    </div>
  );
}

export function ListFilterField({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="list-filter-field"
      className={cn("flex w-full flex-col gap-2 md:w-48", className)}
    >
      {children}
    </div>
  );
}
