"use client";

import type { CSSProperties, ReactNode } from "react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/** Match Tailwind `lg` — preview stacks below this width. */
const PREVIEW_COLLAPSE_MAX = 1023;

function subscribePreviewCollapse(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${PREVIEW_COLLAPSE_MAX}px)`);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getPreviewCollapseSnapshot() {
  return window.matchMedia(`(max-width: ${PREVIEW_COLLAPSE_MAX}px)`).matches;
}

/** SSR + first client paint: assume narrow (collapsed) to avoid CLS. */
function getPreviewCollapseServerSnapshot() {
  return true;
}

function useCollapseDocumentPreview() {
  return useSyncExternalStore(
    subscribePreviewCollapse,
    getPreviewCollapseSnapshot,
    getPreviewCollapseServerSnapshot,
  );
}

export function DocumentFormPreviewAside({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const collapse = useCollapseDocumentPreview();

  if (collapse) {
    return (
      <aside className={cn("min-w-0 w-full", className)} style={style}>
        <details className="group rounded-md border border-border">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-base font-medium [&::-webkit-details-marker]:hidden">
            Show preview
            <span className="text-sm font-normal text-muted-foreground group-open:hidden">
              Tap to expand
            </span>
            <span className="hidden text-sm font-normal text-muted-foreground group-open:inline">
              Hide
            </span>
          </summary>
          <div className="border-t border-border p-3">{children}</div>
        </details>
      </aside>
    );
  }

  return (
    <aside
      className={cn("min-w-0 w-full lg:sticky lg:top-4", className)}
      style={style}
    >
      {children}
    </aside>
  );
}
