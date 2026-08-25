import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * `prisma generate` only needs a syntactically valid URL. Prefer DATABASE_URL
 * when set; otherwise use a local placeholder so fresh CI/Netlify clones can
 * generate the client before Next build without requiring secrets at generate time.
 * migrate/db push still need a real DATABASE_URL in the environment.
 */
function datasourceUrl(): string {
  try {
    return env("DATABASE_URL");
  } catch {
    return "postgresql://postgres:postgres@127.0.0.1:5432/prisma_generate";
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl(),
  },
});
