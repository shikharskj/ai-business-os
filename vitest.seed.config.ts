import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Isolated Vitest config for local volume seeding.
 * Reuses the server-only stub so Prisma infrastructure modules can load outside Next.js.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["scripts/seed-volume-dataset.ts"],
    fileParallelism: false,
    testTimeout: 15 * 60 * 1000,
    hookTimeout: 60_000,
  },
});
