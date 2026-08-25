import Link from "next/link";
import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";

type PublicBrandProps = {
  href?: string;
  className?: string;
  /** When true, use inverted colors for a primary (dark) panel. */
  inverted?: boolean;
  size?: "default" | "sm";
};

export function PublicBrand({
  href = "/",
  className,
  inverted = false,
  size = "default",
}: PublicBrandProps) {
  const tileSize = size === "sm" ? "size-8" : "size-9";
  const iconSize = size === "sm" ? "size-4" : "size-5";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-3 text-base font-medium",
        inverted ? "text-primary-foreground" : "text-foreground",
        className
      )}
    >
      <span
        className={cn(
          "flex aspect-square items-center justify-center rounded-md",
          tileSize,
          inverted
            ? "bg-primary-foreground text-primary"
            : "bg-primary text-primary-foreground"
        )}
      >
        <Building2 className={iconSize} aria-hidden />
      </span>
      <span>AI Business OS</span>
    </Link>
  );
}
