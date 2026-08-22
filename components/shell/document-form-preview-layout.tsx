import type { CSSProperties, ReactNode } from "react";

import { documentPreviewAsideStyle } from "@/components/business/invoice-document";
import { cn } from "@/lib/utils";

/** Full-width shell for create/edit/detail pages with a document preview column. */
export function DocumentPreviewPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-1 flex-col gap-6", className)}>
      {children}
    </div>
  );
}

/**
 * Two-column layout: main content grows (`1fr`), preview uses a fixed A4-scaled width.
 * Stacks on small screens.
 */
export function DocumentFormPreviewLayout({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--document-preview-width)]",
        className
      )}
      style={{ ...documentPreviewAsideStyle, ...style }}
    >
      {children}
    </div>
  );
}

export function DocumentFormPreviewMain({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0 w-full", className)}>{children}</div>;
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
  return (
    <aside className={cn("min-w-0 w-full lg:sticky lg:top-4", className)} style={style}>
      {children}
    </aside>
  );
}
