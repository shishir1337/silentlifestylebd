import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { rateLimitStorage } from "@/lib/redis";
import { TRUSTED_PROXIES } from "@/lib/client-ip";
import { sendMail } from "@/lib/mailer";

/**
 * Authentication.
 *
 * One system serves two audiences. Shoppers may create an account, but never
 * have to — guest checkout stays the default path, and nothing about buying
 * requires signing in. Staff use the same sign-in form; what separates them is
 * `User.staffRole`, which is checked server-side on every admin page and
 * action (see `dal.ts`).
 *
 * This module is the configuration only. It is never a security boundary on
 * its own: a route is protected because it calls the DAL, not because this
 * file exists.
 */

/** Public origin. Falls back to localhost so a fresh clone runs without setup. */
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/**
 * Origins allowed to drive auth requests.
 *
 * better-auth validates the Origin header and every redirect target against
 * this list, so an attacker's page cannot post a sign-in to our endpoint and
 * cannot redirect a successful one to their own domain.
 *
 * Development also trusts localhost on any port, because the verification
 * harness runs the production build on a different port than `next dev`. That
 * allowance is conditional on NODE_ENV and never reaches production.
 */
const trustedOrigins =
  process.env.NODE_ENV === "production"
    ? [baseURL, process.env.NEXT_PUBLIC_SITE_URL].filter((o): o is string => Boolean(o))
    : [baseURL, "http://localhost:*", "http://127.0.0.1:*"];

export const auth = betterAuth({
  appName: "Silent Lifestyle BD",
  baseURL,
  trustedOrigins,

  database: prismaAdapter(db, {
    provider: "postgresql",
    // Sign-up writes a User and an Account; without this they are two
    // statements, and a crash between them leaves an account nobody can use.
    transaction: true,
  }),

  emailAndPassword: {
    enabled: true,
    /**
     * No verification gate. There is no email provider yet, so requiring one
     * would mean nobody could finish signing up — and for a store where the
     * account is a convenience rather than a requirement, an unverified email
     * costs little. Verification becomes worth adding when email carries
     * something that matters, such as an invoice.
     */
    requireEmailVerification: false,
    autoSignIn: true,
    // better-auth's default is 8. Raised because this guards an admin panel.
    minPasswordLength: 10,
    // Resetting the password kills every other session — the usual reason to
    // reset one is that somebody else may be holding it.
    revokeSessionsOnPasswordReset: true,

    async sendResetPassword({ user, url }) {
      await sendMail({
        to: user.email,
        subject: "Reset your Silent Lifestyle BD password",
        text:
          `Hello ${user.name},\n\n` +
          `Open this link to choose a new password. It expires in one hour.\n\n` +
          `${url}\n\n` +
          `If you did not ask for this, you can ignore this email — your ` +
          `current password still works.\n`,
      });
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days — a shop, not a bank.
    updateAge: 60 * 60 * 24, // Slide the expiry at most once a day.
    /**
     * Session identity is cached in a signed cookie for five minutes, so an
     * ordinary page view does not query Postgres to learn who is signed in.
     *
     * Staff authorisation deliberately does NOT ride on this: `requireStaff`
     * re-reads `staffRole` from the database every time. Revoking someone's
     * admin access has to take effect immediately, not within five minutes.
     */
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  rateLimit: {
    enabled: true,
    /**
     * Redis, via a custom storage rather than `secondaryStorage`. Sessions
     * stay in Postgres as a result — see the note in `redis.ts` for why that
     * distinction matters more than it looks.
     */
    customStorage: rateLimitStorage,
    customRules: {
      // The endpoints that actually get attacked. Deliberately tighter than
      // better-auth's defaults, because a BD mobile retail shop has no
      // legitimate reason to see five sign-in attempts a minute from one IP.
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 10, max: 3 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
      "/reset-password": { window: 60 * 10, max: 5 },
    },
  },

  advanced: {
    cookiePrefix: "slbd",
    // HTTPS in production; plain HTTP locally, or the cookie is never stored.
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: { sameSite: "lax" },
    ipAddress: {
      // The app sits behind the client's reverse proxy, so the socket address
      // is the proxy. Without this, every request rate-limits as one IP.
      ipAddressHeaders: ["x-forwarded-for"],
      /**
       * Which hops in that header are ours.
       *
       * This is not optional tuning — without it better-auth cannot use the
       * header safely and falls back to one of two broken behaviours: a chain
       * of one entry is believed outright, so a forged `X-Forwarded-For`
       * defeats the sign-in limiter entirely (proven: rotating the value, a
       * dozen wrong passwords in a row went uncounted), and a chain of more
       * than one resolves to no address at all, so every visitor on earth
       * shares a single five-attempts-a-minute bucket.
       *
       * With it, the chain is read from the right and the first hop that is
       * not ours is the caller — the one entry a client cannot choose. Same
       * list as the storefront limiters; see `client-ip.ts`.
       */
      trustedProxies: TRUSTED_PROXIES,
      // Count an IPv6 caller by its /64, which is the smallest block an ISP
      // hands to one subscriber. Per-address would let one customer rotate
      // through a prefix and never be counted twice.
      ipv6Subnet: 64,
    },
  },

  databaseHooks: {
    session: {
      create: {
        after: async ({ id, userId, ipAddress }) => {
          /**
           * Audit trail for staff sign-ins only.
           *
           * Logging every shopper session would bury the one event worth
           * noticing — somebody signing in to the admin panel — in thousands
           * of routine ones.
           */
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, staffRole: true },
          });
          if (!user?.staffRole) return;

          console.log(
            `[audit] staff sign-in role=${user.staffRole} email=${user.email} ` +
              `ip=${ipAddress || "unknown"} session=${id}`,
          );
        },
      },
    },
  },

  /**
   * Lets Server Actions set the session cookie. Without it, signing in from an
   * action succeeds on the server and the browser never receives the cookie.
   * Must stay last in the list.
   */
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
