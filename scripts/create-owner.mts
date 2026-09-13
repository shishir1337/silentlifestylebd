import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

/**
 * Creates the shop owner's account from the command line.
 *
 * Solves exactly one problem: the very first administrator. Staff roles are
 * granted from inside the admin panel, which needs an owner to already exist,
 * so the first one has to come from somewhere else — and "somewhere else" must
 * never be a page on the public internet that creates administrators.
 *
 * Whoever runs this already holds the database credentials, so it grants them
 * nothing they could not do with psql. That is the point.
 *
 *   pnpm admin:create owner@example.com "a good long password" "Their Name"
 *
 * The password is hashed with better-auth's own hasher, so the account is
 * identical to one created through the sign-up form. Nothing here bypasses
 * authentication; it only skips the form.
 */

try {
  process.loadEnvFile();
} catch {
  // Docker and CI supply the environment directly.
}

/** Must match `emailAndPassword.minPasswordLength` in src/lib/auth.ts. */
const MIN_PASSWORD = 10;

const [email, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim() || "Shop Owner";
const force = process.argv.includes("--force-password");

function usage(message: string): never {
  console.error(
    `${message}\n\n` +
      `  pnpm admin:create <email> <password> [name]\n\n` +
      `The password must be at least ${MIN_PASSWORD} characters. Quote it if it\n` +
      `contains spaces. If the account already exists this only grants OWNER —\n` +
      `add --force-password to also reset the password.`,
  );
  process.exit(1);
}

if (!email || !password) usage("Missing arguments.");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) usage(`"${email}" is not an email address.`);
if (password.length < MIN_PASSWORD && !force) {
  usage(`That password is ${password.length} characters; at least ${MIN_PASSWORD} are needed.`);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const existing = await db.user.findUnique({
  where: { email },
  select: { id: true, name: true, staffRole: true },
});

if (existing) {
  await db.user.update({ where: { id: existing.id }, data: { staffRole: "OWNER" } });

  if (force) {
    const hash = await hashPassword(password);
    // `providerId: "credential"` is better-auth's email-and-password account,
    // and it stores one per user with accountId equal to the user id.
    await db.account.updateMany({
      where: { userId: existing.id, providerId: "credential" },
      data: { password: hash },
    });
    console.log(`Reset the password for ${existing.name} <${email}> and granted OWNER.`);
  } else {
    console.log(
      `${existing.name} <${email}> already exists — granted OWNER ` +
        `(was ${existing.staffRole ?? "none"}).\n` +
        `Their password is unchanged. Add --force-password to reset it.`,
    );
  }
} else {
  const hash = await hashPassword(password);

  await db.user.create({
    data: {
      name,
      email,
      // No verification flow is configured, and an owner who cannot sign in
      // because nobody sent them an email is worse than an unverified address.
      emailVerified: true,
      staffRole: "OWNER",
      accounts: {
        create: { providerId: "credential", accountId: "", password: hash },
      },
    },
  });

  // better-auth expects accountId to equal the user id for credential accounts;
  // it is not known until the user row exists, so it is set immediately after.
  const created = await db.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  await db.account.updateMany({
    where: { userId: created.id, providerId: "credential" },
    data: { accountId: created.id },
  });

  console.log(`Created ${name} <${email}> as OWNER.`);
}

console.log("Sign in at /signin, then open /admin.");

await db.$disconnect();
