/**
 * Production build entry for CI/Netlify/Vercel.
 * Ensures DATABASE_URL is set for `prisma generate` + Next page-data collection
 * when the host has not configured secrets yet (generate/build only).
 */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@127.0.0.1:5432/prisma_generate";
}

if (
  process.env.NETLIFY === "true" &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
) {
  console.error(
    "\nNetlify build: set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in Site configuration → Environment variables (include Deploy previews), then trigger a new deploy.\n"
  );
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "generate"]);
run("npx", ["next", "build"]);
