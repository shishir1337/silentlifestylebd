import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic redirects for the address bar. **Not** the security boundary.
 *
 * All this does is look for a session cookie. It does not validate it, does
 * not read the database and cannot tell a customer from an owner — a forged
 * cookie walks straight past. That is fine, because the page behind it calls
 * the DAL, which does all three. What this buys is the redirect happening
 * before the route renders, so a signed-out visitor lands on the sign-in form
 * instead of watching a dashboard flash and vanish.
 *
 * Two reasons it can never be more than this:
 *
 *  - Proxy runs on every request including prefetches, so a database read here
 *    would put a query behind every hovered link.
 *  - Server Functions are POSTs to the page's own route, not routes of their
 *    own. A matcher change, or moving an action to a different file, silently
 *    removes proxy coverage with no error anywhere. Next's own docs say to
 *    verify inside each Server Function rather than rely on this.
 */
export function proxy(request: NextRequest) {
  const cookie = getSessionCookie(request, { cookiePrefix: "slbd" });
  if (cookie) return NextResponse.next();

  const signIn = new URL("/signin", request.url);
  // Come back to where they were headed once they are in. Only the path and
  // query are carried over, never a full URL — an attacker-supplied `next`
  // pointing at another origin is an open redirect.
  signIn.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signIn);
}

export const config = {
  /**
   * Deliberately narrow. `/checkout` is absent: guest checkout is the default
   * path through this store and must never ask anyone to sign in.
   */
  matcher: ["/account/:path*", "/admin/:path*"],
};
