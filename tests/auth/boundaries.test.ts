import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function walk(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return walk(fullPath);
    }

    return [fullPath];
  });
}

describe("authentication boundaries", () => {
  it("keeps Clerk SDK imports out of domain modules", () => {
    const files = walk(path.join(ROOT, "modules")).filter((file) =>
      /\.(ts|tsx)$/.test(file)
    );

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@clerk\/nextjs/);
    }
  });

  it("does not expose Clerk secrets in client modules", () => {
    const files = [
      ...walk(path.join(ROOT, "app")),
      ...walk(path.join(ROOT, "components")),
    ].filter((file) => /\.(ts|tsx)$/.test(file));

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const isClientModule =
        source.includes('"use client"') || source.includes("'use client'");

      if (!isClientModule) {
        continue;
      }

      expect(source, file).not.toMatch(/CLERK_SECRET_KEY/);
      expect(source, file).not.toMatch(/CLERK_WEBHOOK_SIGNING_SECRET/);
    }
  });
});
