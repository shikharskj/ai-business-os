"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  COMMAND_MENU_EXTRA_ROUTES,
  filterWorkspaceNav,
  flattenWorkspaceNavLeaves,
} from "@/components/shell/workspace-nav";
import type { MembershipRole } from "@/modules/tenant/domain/types";
import {
  SEARCH_ENTITY_LABEL,
  type SearchResponse,
  type SearchResult,
} from "@/modules/search/domain/types";

export function WorkspaceCommandMenu({ role }: { role: MembershipRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recordResults, setRecordResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const pageRoutes = useMemo(() => {
    const navRoutes = flattenWorkspaceNavLeaves(filterWorkspaceNav(role));
    return [...navRoutes, ...COMMAND_MENU_EXTRA_ROUTES];
  }, [role]);

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

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!open || trimmedQuery.length < 1) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&limit=8`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setRecordResults([]);
          return;
        }
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          setRecordResults([]);
          return;
        }
        const data = (await response.json()) as SearchResponse;
        if (!data.results || !Array.isArray(data.results)) {
          setRecordResults([]);
          return;
        }
        setRecordResults(data.results);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setRecordResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, trimmedQuery]);

  const displayedRecords = trimmedQuery.length < 1 ? [] : recordResults;

  const routeResults = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (!q) return pageRoutes;
    return pageRoutes.filter(
      (route) =>
        route.label.toLowerCase().includes(q) ||
        route.keywords.includes(q) ||
        route.href.includes(q),
    );
  }, [pageRoutes, trimmedQuery]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setRecordResults([]);
    router.push(href);
  }

  const showEmpty =
    trimmedQuery.length > 0 &&
    !loading &&
    displayedRecords.length === 0 &&
    routeResults.length === 0;

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
        <span className="text-muted-foreground min-w-44 text-left">Search</span>
        <kbd className="flex items-center gap-1 text-sm text-muted-foreground">
          <Command className="size-4" />
          <Plus className="size-4" /> <span className="text-sm"> K</span>
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open search"
      >
        <Search className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-3 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Find business records or jump to a workspace page.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Customer, invoice, product, payment…"
            autoFocus
          />
          <div className="max-h-80 overflow-auto rounded-md border border-border">
            {loading ? (
              <p className="p-3 text-base text-muted-foreground">Searching…</p>
            ) : null}

            {showEmpty ? (
              <p className="p-3 text-base text-muted-foreground">No matches.</p>
            ) : null}

            {displayedRecords.length > 0 ? (
              <div>
                <p className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Records
                </p>
                <ul>
                  {displayedRecords.map((row) => (
                    <li key={`${row.entityType}:${row.id}`}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-muted/50"
                        onClick={() => go(row.href)}
                      >
                        <span className="flex w-full items-baseline justify-between gap-2">
                          <span className="font-medium">{row.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {SEARCH_ENTITY_LABEL[row.entityType]}
                          </span>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {[row.subtitle, row.status, row.amountLabel]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {routeResults.length > 0 ? (
              <div>
                <p className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pages
                </p>
                <ul>
                  {routeResults.map((route) => (
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
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {trimmedQuery.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                go(`/app/search?q=${encodeURIComponent(trimmedQuery)}`)
              }
            >
              Open full search
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
