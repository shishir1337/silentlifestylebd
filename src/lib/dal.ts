import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { StaffRole } from "@prisma/client";

/**
 * The Data Access Layer — where authorisation actually happens.
 *
 * Two places that look like the obvious home for this are documented
 * non-boundaries, and both were considered and rejected:
 *
 *  - **Layouts don't gate anything.** Next's own auth guide is explicit: a
 *    layout "does not control whether the rest of the route renders", and it
 *    does not re-render on navigation. Sibling segments render into the RSC
 *    payload regardless of what a layout decides to show.
 *  - **`proxy.ts` doesn't cover Server Actions.** Actions are POSTs to the page
 *    route, so a matcher change or moving an action to another file can
 *    silently remove proxy coverage without any error.
 *
 * So every page and every Server Action that touches protected data calls into
 * this module itself. `proxy.ts` is a redirect for the address bar, not a lock.
 *
 * Everything here returns a DTO — never a Prisma row. A row carries the
 * password hash's neighbours, the staff role and whatever columns get added
 * next year, and sooner or later one gets passed to a Client Component.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface StaffUser extends SessionUser {
  role: StaffRole;
}

/**
 * The current session, or null.
 *
 * `cache()` memoises this for one render pass, so a page, its Server
 * Components and its data reads share a single lookup rather than each paying
 * for their own.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
});

/** Signed-in customers only. Redirects to sign-in otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/signin");
  return user;
}

/**
 * Staff only, optionally narrowed to specific roles.
 *
 * The role is read from the database on every call, deliberately. Session data
 * is cached in a cookie for five minutes, and `staffRole` is the single most
 * security-sensitive column in the schema: revoking someone's admin access has
 * to take effect when it is revoked, not when their cookie happens to expire.
 *
 * Signed-out visitors go to sign-in. Signed-in non-staff get a 404 from the
 * caller rather than a redirect, because "this page exists but is not for you"
 * tells an attacker the admin panel is here.
 */
export async function requireStaff(allowed?: StaffRole[]): Promise<StaffUser> {
  const user = await getSession();
  if (!user) redirect("/signin");

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { staffRole: true },
  });

  if (!row?.staffRole) return notStaff();
  if (allowed && !allowed.includes(row.staffRole)) return notStaff();

  return { ...user, role: row.staffRole };
}

/**
 * Same treatment for a customer who is signed in but not staff and for one who
 * is not staff at all: the admin panel does not confirm its own existence.
 */
function notStaff(): never {
  redirect("/");
}

/**
 * Assert staff inside a Server Action.
 *
 * Actions must not `redirect()` on an authorisation failure — a redirect is a
 * normal-looking response, and a caller that ignores it proceeds as though the
 * action succeeded. Throwing is the honest outcome.
 */
export async function assertStaff(allowed?: StaffRole[]): Promise<StaffUser> {
  const user = await getSession();
  if (!user) throw new Error("Not signed in.");

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { staffRole: true },
  });
  if (!row?.staffRole || (allowed && !allowed.includes(row.staffRole))) {
    throw new Error("Not authorised.");
  }

  return { ...user, role: row.staffRole };
}

/** Assert a signed-in customer inside a Server Action, for the same reason. */
export async function assertUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new Error("Not signed in.");
  return user;
}
