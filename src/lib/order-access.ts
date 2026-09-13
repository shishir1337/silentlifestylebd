import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Which orders this browser is allowed to open.
 *
 * A guest has no account, so nothing about a request says which order belongs
 * to whom. The old build answered that with `localStorage` — which worked, but
 * only because the confirmation page never asked the server anything. Now the
 * order is a row, and `/order/SLB-260913-X873` has to decide whether to show a
 * stranger somebody's name, phone number and home address.
 *
 * Order numbers alone cannot be that decision. They are four characters from a
 * 30-letter alphabet on a given day — about 810,000 combinations, which is a
 * weekend of guessing for a script and is meant to be read aloud over a phone,
 * not kept secret.
 *
 * So placing an order adds its number to an HMAC-signed, HttpOnly cookie. The
 * browser cannot forge an entry, no script on the page can read it, and it
 * grants nothing except the orders that browser actually placed. Signed-in
 * customers do not need it — their orders are looked up by `customerId`.
 */

const COOKIE = "slbd.orders";
/** Enough for a returning customer's recent history; a cookie is not a database. */
const MAX_ORDERS = 20;
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days, matching how long a return might take.

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) {
    throw new Error(
      "BETTER_AUTH_SECRET is not set — order access cookies cannot be signed.",
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Compared with `timingSafeEqual` rather than `===`.
 *
 * A plain comparison returns as soon as two bytes differ, so how long it takes
 * leaks how much of a guessed signature was correct — enough, over many
 * requests, to reconstruct one byte at a time.
 */
function verify(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

function encode(orderNos: string[]): string {
  const payload = Buffer.from(JSON.stringify(orderNos)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined): string[] {
  if (!raw) return [];
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return [];

  const payload = raw.slice(0, dot);
  if (!verify(payload, raw.slice(dot + 1))) return [];

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Order numbers this browser placed, newest first. */
export async function deviceOrderNumbers(): Promise<string[]> {
  return decode((await cookies()).get(COOKIE)?.value);
}

/** Called after a successful placement. Only valid from an action or handler. */
export async function grantOrderAccess(orderNo: string): Promise<void> {
  const jar = await cookies();
  const existing = decode(jar.get(COOKIE)?.value).filter((n) => n !== orderNo);
  const next = [orderNo, ...existing].slice(0, MAX_ORDERS);

  jar.set(COOKIE, encode(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function canOpenOrder(orderNo: string): Promise<boolean> {
  return (await deviceOrderNumbers()).includes(orderNo);
}
