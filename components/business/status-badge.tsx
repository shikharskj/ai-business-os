import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const BADGE_TONES = [
  "success",
  "warning",
  "danger",
  "info",
  "neutral",
] as const;

export type BadgeTone = (typeof BADGE_TONES)[number];

export const badgeToneClassName: Record<BadgeTone, string> = {
  success:
    "border-[var(--state-success)] bg-[var(--state-success-subtle)] text-[var(--state-success)]",
  warning:
    "border-[var(--state-warning)] bg-[var(--state-warning-subtle)] text-[var(--state-warning)]",
  danger:
    "border-[var(--state-error)] bg-[var(--state-error-subtle)] text-[var(--state-error)]",
  info: "border-[var(--state-info)]] bg-[var(--state-info-subtle)] text-[var(--state-info)]",
  neutral: "border-border bg-transparent text-foreground",
};

export const statusBadgeSizeVariants = cva("", {
  variants: {
    size: {
      // Matches previous StatusBadge / shadcn Badge sizing.
      sm: "h-5 gap-1 px-2 py-0.5 text-xs [&>svg]:size-3!",
      md: "h-6 gap-1 px-2.5 py-0.5 text-sm [&>svg]:size-3.5!",
      lg: "h-7 gap-1.5 px-3 py-1 text-sm [&>svg]:size-4!",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type StatusBadgeSize = NonNullable<
  VariantProps<typeof statusBadgeSizeVariants>["size"]
>;

export function StatusBadge({
  tone,
  size = "md",
  children,
  className,
}: {
  tone: BadgeTone;
  size?: StatusBadgeSize;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        badgeToneClassName[tone],
        statusBadgeSizeVariants({ size }),
        className
      )}
    >
      {children}
    </Badge>
  );
}
