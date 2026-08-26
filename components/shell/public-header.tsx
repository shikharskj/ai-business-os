"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";

import { PublicBrand } from "@/components/shell/public-brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", id: "features", label: "Features" },
  { href: "#how-it-works", id: "how-it-works", label: "How it works" },
] as const;

const navLinkClass =
  "rounded-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function PublicHeader() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sections = NAV_LINKS.map(({ id }) =>
      document.getElementById(id)
    ).filter((el): el is HTMLElement => el != null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] }
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-sm sm:gap-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-6">
        <PublicBrand
          size="sm"
          wordmarkClassName="max-[380px]:hidden"
        />
        <nav className="hidden items-center gap-4 text-sm md:flex">
          {NAV_LINKS.map(({ href, id, label }) => (
            <Link
              key={id}
              href={href}
              className={cn(
                navLinkClass,
                activeId === id && "text-foreground underline"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <Show when="signed-out">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/sign-in" />}
          >
            Sign in
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/sign-up" />}
          >
            Sign up
          </Button>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs gap-0 p-0">
            <SheetHeader className="border-b border-border">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-4">
              {NAV_LINKS.map(({ href, id, label }) => (
                <Link
                  key={id}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-base outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                    activeId === id
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
