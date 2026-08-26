/**
 * Production build entry for CI/Netlify/Vercel.
 * Placeholder DATABASE_URL is only for `prisma generate` + Next page-data
 * collection when the host has not configured a real DB yet.
 * Do not invent a production URL for `prisma migrate deploy` — migrate needs
 * a real DATABASE_URL from the host environment.
 */
import { spawnSync } from "node:child_process";

const isNetlify = Boolean(process.env.NETLIFY);
const isVercel = Boolean(process.env.VERCEL);

if (
  isNetlify &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
) {
  console.error(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required for Netlify builds."
  );
  process.exit(1);
}

const hasRealDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
if (!hasRealDatabaseUrl) {
  if (isNetlify || isVercel) {
    console.warn(
      "DATABASE_URL unset: using a placeholder for prisma generate only. " +
        "Do not run prisma migrate deploy without a real pooled Neon URL."
    );
  }
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@127.0.0.1:5432/prisma_generate";
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
