import Link from "next/link";

import { OfhikosCredit } from "@/components/shell/ofhikos-credit";

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <p className="text-base font-medium">AI Business OS</p>
            <p className="text-sm text-muted-foreground">
              Built for Indian GST workflows and day-to-day SME operations.
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
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
            <Link
              href="/sign-in"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Sign up
            </Link>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <OfhikosCredit className="sm:justify-start" />
          <p className="text-center sm:text-right">© 2026 AI Business OS</p>
        </div>
      </div>
    </footer>
  );
}
