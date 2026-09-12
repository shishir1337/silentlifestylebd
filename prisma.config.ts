import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * Prisma 7 removed `url` from the datasource block in `schema.prisma`. The
 * connection string used by `migrate`, `db push` and `studio` lives here
 * instead; the application client gets an explicit driver adapter at runtime
 * (see `src/lib/db.ts`). The split is deliberate on Prisma's side — migrations
 * and the query engine no longer share one connection definition.
 *
 * Prisma 7 also stopped auto-loading `.env`, so we load it ourselves. Node 22
 * has `process.loadEnvFile()` built in, which avoids adding `dotenv` purely to
 * run migrations. In Docker and CI there is no `.env` file — the variables are
 * already in the environment — so a missing file is expected, not an error.
 */
try {
  process.loadEnvFile();
} catch {
  // No .env present: variables come from the real environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: env("DATABASE_URL"),
  },

  migrations: {
    // `pnpm db:seed` runs this; `prisma migrate reset` calls it automatically.
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
});
