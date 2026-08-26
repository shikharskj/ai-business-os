import type { CSSProperties, ReactNode } from "react";

import { documentPreviewAsideStyle } from "@/components/business/invoice-document";
import { DocumentFormPreviewAside } from "@/components/shell/document-form-preview-aside";
import { cn } from "@/lib/utils";

export { DocumentFormPreviewAside };

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
 * Stacks on small screens; preview collapses behind disclosure below lg via Aside.
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
