"use client";

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

/** Collapses secondary detail-page navigation into a More menu. */
export function DetailMoreMenu({ items }: { items: DetailMoreMenuItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label="More actions"
          />
        }
      >
        <MoreHorizontal className="size-5" />
        <span className="sr-only">More</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={`${item.href}:${item.label}`}
            render={<Link href={item.href} />}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
