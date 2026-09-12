/**
 * Sanitises a `?next=` destination.
 *
 * An unchecked redirect target is an open redirect: a link to
 * `/signin?next=https://evil.example/login` sends a customer who just typed
 * their password to a page that looks like ours and asks for it again.
 *
 * Only a path on this site is ever accepted. `//evil.example` is rejected
 * specifically — browsers read a protocol-relative URL as another origin, and
 * it passes a naive "starts with a slash" check.
 */
export function safeNext(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // A backslash is normalised to a forward slash by some browsers, so "/\evil"
  // is another way to spell a protocol-relative URL.
  if (raw.startsWith("/\\")) return fallback;
  return raw;
}
