"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DetailMoreMenuItem = {
  href: string;
  label: string;
};

export type DetailMoreMenuActionItem = {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

/** Collapses secondary detail-page navigation/actions into a single More menu. */
export function DetailMoreMenu({
  items,
  actionItems = [],
  children,
  disabled = false,
}: {
  items?: DetailMoreMenuItem[];
  actionItems?: DetailMoreMenuActionItem[];
  children?: ReactNode;
  disabled?: boolean;
}) {
  const navItems = items ?? [];
  const hasContent =
    navItems.length > 0 || actionItems.length > 0 || children != null;

  if (!hasContent) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label="More actions"
          />
        }
      >
        <MoreHorizontal className="size-5" />
        <span className="sr-only">More</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {navItems.map((item) => (
          <DropdownMenuItem
            key={`${item.href}:${item.label}`}
            render={<Link href={item.href} />}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
        {actionItems.map((item) => (
          <DropdownMenuItem
            key={item.key}
            disabled={item.disabled}
            onClick={item.onClick}
            className={item.destructive ? "text-destructive" : undefined}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
