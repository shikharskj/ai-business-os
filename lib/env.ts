import "server-only";

import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed === "" || trimmed.includes("replace_me")) {
    return undefined;
  }

  return trimmed;
};

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        (value) => value.startsWith("pk_test_") || value.startsWith("pk_live_"),
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key"
      )
      .optional()
  ),
  CLERK_SECRET_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        (value) => value.startsWith("sk_test_") || value.startsWith("sk_live_"),
        "CLERK_SECRET_KEY must be a Clerk secret key"
      )
      .optional()
  ),
  CLERK_WEBHOOK_SIGNING_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  STORAGE_DRIVER: z.preprocess(
    emptyToUndefined,
    z.enum(["local", "r2"]).optional()
  ),
  LOCAL_STORAGE_ROOT: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  STORAGE_MAX_BYTES: z.preprocess((value) => {
    if (value === undefined || value === "") {
      return undefined;
    }
    return Number(value);
  }, z.number().int().positive().optional()),
  CLOUDFLARE_R2_ACCOUNT_ID: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  CLOUDFLARE_R2_BUCKET: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  CLOUDFLARE_R2_ENDPOINT: z.preprocess(
    emptyToUndefined,
    z.string().url().optional()
  ),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
  STORAGE_DRIVER: process.env.STORAGE_DRIVER,
  LOCAL_STORAGE_ROOT: process.env.LOCAL_STORAGE_ROOT,
  STORAGE_MAX_BYTES: process.env.STORAGE_MAX_BYTES,
  CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET: process.env.CLOUDFLARE_R2_BUCKET,
  CLOUDFLARE_R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT,
});

if (
  env.NODE_ENV === "production" &&
  (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !env.CLERK_SECRET_KEY ||
    !env.CLERK_WEBHOOK_SIGNING_SECRET)
) {
  throw new Error(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, and CLERK_WEBHOOK_SIGNING_SECRET are required in production"
  );
}
