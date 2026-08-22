import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const WORKSPACE_ROOT = join(process.cwd(), "app/app/(workspace)");

const REDIRECT_ONLY_ROUTES = new Set([
  "sales/page.tsx",
  "purchases/page.tsx",
  "inventory/page.tsx",
  "accounting/page.tsx",
  "reports/page.tsx",
  "reports/ledger/page.tsx",
  "reports/trial-balance/page.tsx",
  "assistant/page.tsx",
]);

function listPageFiles(dir: string, prefix = ""): string[] {
  const entries = readdirSync(dir);
  const pages: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry}` : entry;
    const absolutePath = join(dir, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      pages.push(...listPageFiles(absolutePath, relativePath));
      continue;
    }

    if (entry === "page.tsx") {
      pages.push(relativePath);
    }
  }

  return pages;
}

describe("workspace loading coverage", () => {
  it("has loading.tsx for each non-redirect workspace page route", () => {
    const pageFiles = listPageFiles(WORKSPACE_ROOT);
    const missing: string[] = [];

    for (const pageFile of pageFiles) {
      if (REDIRECT_ONLY_ROUTES.has(pageFile)) {
        continue;
      }

      const routeDir =
        pageFile === "page.tsx" ? "" : pageFile.replace(/\/page\.tsx$/, "");
      const loadingPath = join(WORKSPACE_ROOT, routeDir, "loading.tsx");
      try {
        statSync(loadingPath);
      } catch {
        missing.push(routeDir || "(workspace root)");
      }
    }

    expect(missing).toEqual([]);
  });
});
