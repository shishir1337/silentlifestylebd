import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * The Prisma client.
 *
 * `server-only` is the point of this module: importing it from a Client
 * Component is a build error rather than a leaked database connection string.
 * Nothing outside the server ever touches this.
 *
 * Prisma 7 requires an explicit driver adapter — the schema no longer carries a
 * connection URL, so the client is handed a real `pg` pool here.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Failing at import time beats a confusing "cannot reach database" on the
  // first request, which is easy to misread as the database being down.
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
  );
}

function createClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    // Queries are noisy; warnings and errors are the ones worth seeing.
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

/**
 * In development Next hot-reloads modules on every edit. Without this global,
 * each reload would construct another client and another connection pool until
 * Postgres refuses new connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
