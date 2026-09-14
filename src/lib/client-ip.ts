import "server-only";

/**
 * Who is asking — the one answer, for every rate limiter.
 *
 * This used to be `x-forwarded-for.split(",")[0]`, which is the wrong end of
 * the list and made every limit in the shop decorative. The header is a chain
 * the client writes the start of: nginx's `$proxy_add_x_forwarded_for`
 * *appends* the real address, so a request arriving with
 *
 *     X-Forwarded-For: 1.2.3.4
 *
 * reaches the app as `1.2.3.4, <the real client>`. Reading the first entry
 * reads the attacker's own value, and a script that changes it every request
 * is never counted at all. Proven against sign-in: with one forged value the
 * limiter tripped after five tries; rotating the value, twelve tries in a row
 * went through untouched.
 *
 * So the chain is walked from the **right**, skipping addresses we put there
 * ourselves, and the first one we did not is the caller. That entry is the
 * only one in the whole header a client cannot choose.
 *
 * `null` means the caller could not be identified — the header was absent, or
 * every hop in it is trusted, or the chain is malformed. It is deliberately
 * not a string: a placeholder like `"unknown"` is a single shared bucket, and
 * whether sharing one bucket is safer than not counting at all depends on what
 * is being protected. Each caller decides; see `order-actions.ts`.
 */

/**
 * The hops in front of the app, as CIDRs.
 *
 * Defaults cover the two ways this is actually deployed: the reverse proxy on
 * the host talking to a published port (loopback), and one container talking
 * to another over a compose network (the private ranges Docker allocates
 * from). Override with `TRUSTED_PROXIES` when the proxy is somewhere else —
 * a separate machine, or a CDN's egress ranges.
 */
const DEFAULT_TRUSTED = [
  "127.0.0.0/8",
  "::1/128",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "fc00::/7",
];

const configured = (process.env.TRUSTED_PROXIES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const TRUSTED_PROXIES: string[] =
  configured.length > 0 ? configured : DEFAULT_TRUSTED;

interface Cidr {
  bytes: number[];
  bits: number;
}

/** `"10.0.0.0/8"` → bytes plus prefix length. Null for anything unparseable. */
function parseCidr(entry: string): Cidr | null {
  const [address, prefix] = entry.split("/");
  const bytes = toBytes(address ?? "");
  if (!bytes) return null;
  const bits = prefix === undefined ? bytes.length * 8 : Number(prefix);
  if (!Number.isInteger(bits) || bits < 0 || bits > bytes.length * 8) return null;
  return { bytes, bits };
}

/**
 * An address as bytes: four for IPv4, sixteen for IPv6.
 *
 * IPv4-mapped IPv6 (`::ffff:1.2.3.4`) is reduced to its IPv4 form first, so a
 * proxy that reports the same address in either notation matches the same
 * rule rather than silently missing it.
 */
function toBytes(address: string): number[] | null {
  const value = address.trim().replace(/^\[|\]$/g, "");
  if (!value) return null;

  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(value);
  const v4 = mapped ? mapped[1] : value;

  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) {
    const parts = v4.split(".").map(Number);
    return parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
  }

  if (!value.includes(":")) return null;

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : fill < 0) return null;

  const groups = halves.length === 1 ? head : [...head, ...Array(fill).fill("0"), ...tail];
  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    const n = parseInt(group, 16);
    bytes.push(n >> 8, n & 0xff);
  }
  return bytes.length === 16 ? bytes : null;
}

/** Does this address fall inside this range? Families must match. */
function inRange(address: number[], cidr: Cidr): boolean {
  if (address.length !== cidr.bytes.length) return false;
  let bits = cidr.bits;
  for (let i = 0; i < address.length && bits > 0; i++) {
    const take = Math.min(8, bits);
    const mask = (0xff << (8 - take)) & 0xff;
    if ((address[i] & mask) !== (cidr.bytes[i] & mask)) return false;
    bits -= take;
  }
  return true;
}

const TRUSTED: Cidr[] = TRUSTED_PROXIES.map(parseCidr).filter(
  (c): c is Cidr => c !== null,
);

/**
 * The caller's address, or null if it cannot be established.
 *
 * Takes a `Headers` rather than calling `headers()` itself so the same
 * function can be unit-tested and reused from anywhere a request is in hand.
 */
export function clientIp(headers: Headers): string | null {
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Right to left: the last entry was written by whatever spoke to us, and
  // each trusted hop we step over hands the question to the one before it.
  for (let i = chain.length - 1; i >= 0; i--) {
    const bytes = toBytes(chain[i]);
    // A malformed hop means the chain cannot be reasoned about past this
    // point, and guessing is how the original bug happened. Stop.
    if (!bytes) return null;
    if (TRUSTED.some((cidr) => inRange(bytes, cidr))) continue;
    return chain[i];
  }

  /*
    Nothing usable in the chain. `x-real-ip` is only consulted here, and only
    when there was no chain at all: nginx sets it from `$remote_addr`, but so
    can a client talking to the app directly, so it is a fallback for a
    single-proxy deployment rather than evidence.
  */
  if (chain.length === 0) {
    const real = headers.get("x-real-ip")?.trim();
    if (real && toBytes(real)) return real;
  }
  return null;
}
