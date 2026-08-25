import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

import { PublicBrand } from "@/components/shell/public-brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
      <div className="flex items-center gap-6">
        <PublicBrand size="sm" />
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link
            href="#features"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            How it works
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Show when="signed-out">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/sign-in" />}
          >
            Sign in
          </Button>
          <Button nativeButton={false} render={<Link href="/sign-up" />}>
            Sign up
          </Button>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
