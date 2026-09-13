import { notFound } from "next/navigation";

/**
 * Every address the shop does not have.
 *
 * Without this, an unknown URL falls past the route group to Next's own bare
 * 404 — black text on white, no header, no way back. A shop's most common 404
 * is a stale link from a search result or a friend's message, and dropping
 * that customer on a dead page is a sale lost at the door.
 *
 * A catch-all is the lowest-priority match in the router, so every real route
 * still wins: `/products/[slug]` is more specific than this and is matched
 * first. All this does is put the unmatched remainder inside the storefront
 * layout, where `not-found.tsx` can answer with the header, the footer and the
 * current categories.
 *
 * `dynamic = "force-static"` keeps it off the request path: there is nothing
 * here to compute, and without it the route would be rendered per request for
 * every bot probing for `/wp-login.php`.
 */
export const dynamic = "force-static";

export default function UnmatchedRoute(): never {
  notFound();
}
