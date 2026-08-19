import "dotenv/config";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/ai_business_os";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_vitest_placeholder";
process.env.CLERK_SECRET_KEY ??= "sk_test_vitest_placeholder";
process.env.CLERK_WEBHOOK_SIGNING_SECRET ??= "whsec_vitest_placeholder";
process.env.STORAGE_DRIVER ??= "local";
