"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const ROUTES = [
  { label: "Dashboard", href: "/app", keywords: "home overview" },
  { label: "Invoices", href: "/app/sales/invoices", keywords: "sales bill" },
  { label: "Customers", href: "/app/sales/customers", keywords: "party" },
  { label: "Expenses", href: "/app/expenses", keywords: "spend" },
  { label: "Purchases", href: "/app/purchases/bills", keywords: "supplier bills" },
  { label: "Inventory", href: "/app/inventory/stock", keywords: "stock products" },
  { label: "Reports", href: "/app/reports", keywords: "gst summary" },
  { label: "Accounting", href: "/app/accounting", keywords: "ledger journals" },
  { label: "Settings", href: "/app/settings", keywords: "business profile" },
  { label: "AI Assistant", href: "/app/assistant", keywords: "chat help" },
] as const;

export function WorkspaceCommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROUTES;
    return ROUTES.filter(
      (route) =>
        route.label.toLowerCase().includes(q) ||
        route.keywords.includes(q) ||
        route.href.includes(q)
    );
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden gap-2 md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="text-muted-foreground">Search</span>
        <kbd className="rounded border border-border px-1.5 text-xs text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open command menu"
      >
        <Search className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-3 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Go to</DialogTitle>
            <DialogDescription>
              Jump to a workspace page. Full search arrives in a later release.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a page name…"
            autoFocus
          />
          <ul className="max-h-72 overflow-auto rounded-md border border-border">
            {results.length === 0 ? (
              <li className="p-3 text-base text-muted-foreground">No matches.</li>
            ) : (
              results.map((route) => (
                <li key={route.href}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-base hover:bg-muted/50"
                    onClick={() => go(route.href)}
                  >
                    <span>{route.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {route.href}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
