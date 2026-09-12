import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Grants or revokes admin access from the command line.
 *
 * This exists to solve exactly one problem: the first owner. Staff roles are
 * granted from inside the admin panel, which requires an owner to already
 * exist — so the very first one has to come from somewhere else, and "somewhere
 * else" must not be a page on the public internet that creates administrators.
 *
 * Whoever runs this already has the database credentials, so it grants them
 * nothing they could not do with psql. That is the point.
 *
 *   pnpm admin:grant owner@example.com OWNER
 *   pnpm admin:grant someone@example.com none    # revoke
 */

try {
  process.loadEnvFile();
} catch {
  // Docker and CI supply the environment directly.
}

const ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
type Role = (typeof ROLES)[number];

const [email, roleArg] = process.argv.slice(2);

function usage(message: string): never {
  console.error(
    `${message}\n\n` +
      `  pnpm admin:grant <email> <${ROLES.join("|")}|none>\n\n` +
      `The person must already have signed up on the site — this changes an\n` +
      `existing account's role, it never creates one.`,
  );
  process.exit(1);
}

if (!email || !roleArg) usage("Missing arguments.");

const role = roleArg.toUpperCase();
const revoking = role === "NONE";
if (!revoking && !ROLES.includes(role as Role)) usage(`Unknown role "${roleArg}".`);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const user = await db.user.findUnique({
  where: { email },
  select: { id: true, name: true, staffRole: true },
});

if (!user) {
  console.error(
    `No account for ${email}.\n` +
      `Ask them to create one at /signup first, then run this again.`,
  );
  await db.$disconnect();
  process.exit(1);
}

await db.user.update({
  where: { id: user.id },
  data: { staffRole: revoking ? null : (role as Role) },
});

console.log(
  revoking
    ? `Revoked admin access for ${user.name} <${email}> (was ${user.staffRole ?? "none"}).`
    : `${user.name} <${email}> is now ${role} (was ${user.staffRole ?? "none"}).`,
);
console.log("Their next request uses the new role — the check never reads a cookie.");

await db.$disconnect();
