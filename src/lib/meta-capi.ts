import "server-only";

import { createHash } from "node:crypto";
import { getMetaCapiConfig } from "@/lib/settings";
import { canonicalPhone } from "@/lib/phone";

/**
 * The half of Meta's measurement a content blocker cannot delete.
 *
 * The pixel in the browser is the obvious half, and the fragile one: an ad
 * blocker, a privacy setting, a tab closed on the confirmation page or a phone
 * that lost signal all remove it. On a cash-on-delivery shop advertising on
 * Meta, a Purchase that never arrives is not a missing statistic — it is the
 * ad set that gets turned off for looking unprofitable.
 *
 * So the same Purchase is sent from here, where none of that can reach it.
 * Both carry the order number as the event ID, and Meta discards the second
 * one it sees within 48 hours. That deduplication is the entire reason the
 * browser event was given an `eventID` before any of this existed.
 *
 * ## Only Purchase
 *
 * Not ViewContent, AddToCart or InitiateCheckout, and not because they were
 * forgotten:
 *
 *  - A product page is prerendered. Reporting a view from the server would
 *    mean rendering that page per request, which is the one regression this
 *    whole codebase is arranged to prevent.
 *  - The alternative — a route the browser posts those events to — would let
 *    anyone post conversions into the shop's pixel by hand. The data this
 *    feature exists to make trustworthy would be the first casualty.
 *
 * A purchase is different: it happens on the server, in a transaction, with an
 * order number and a real phone behind it. It is the only one of the four this
 * server can honestly claim to have witnessed.
 *
 * ## Matching
 *
 * Meta pays for this in match quality — a hashed phone number and name from a
 * real order identify a person far better than a cookie does. So the customer
 * details go with it, SHA-256 hashed exactly as Meta specifies, and never in
 * any other form.
 *
 * Nothing here throws, and it runs after the response. An order is placed or
 * it is not; a measurement platform being slow, rate-limited or down must
 * never be the reason a customer sees an error.
 */

/** Pinned. An API version Meta supports for at least two years beats one that
    silently changes shape under a shop nobody is watching. */
const API_VERSION = "v25.0";

/** Long enough for a slow network, short enough not to hold a worker open. */
const TIMEOUT_MS = 6000;

/**
 * Where the events actually go. Meta, unless something says otherwise.
 *
 * This code path is invisible by design — it runs after the response and tells
 * the customer nothing — so the only way to prove what it sends is to point it
 * at something that will show you. `META_GRAPH_ORIGIN` is that seam, and it is
 * how the payload in `pw/capi.mjs` was read: the hashes, the units, the fact
 * that the token is in the body and the customer's phone number is not
 * anywhere in it.
 *
 * Unset in every real deployment, and `.env.example` does not mention it —
 * a shop that sets this by accident silently stops reporting to Meta.
 */
const GRAPH_ORIGIN = process.env.META_GRAPH_ORIGIN || "https://graph.facebook.com";

export interface CapiPurchase {
  /** Also the event ID. Must be the same string the browser sent. */
  orderNo: string;
  /** Total the customer pays, delivery included. */
  value: number;
  currency: string;
  items: { sku: string; quantity: number; price: number }[];
  customerName: string;
  /** As stored on the order. Canonicalised here. */
  customerPhone: string;
  /** The confirmation page. Required for a website event. */
  eventSourceUrl: string;
  /** Required for a website event; null only if the header was missing. */
  userAgent: string | null;
  clientIp: string | null;
  /** `_fbp` cookie, verbatim. Null when the pixel never ran. */
  fbp: string | null;
  /** `_fbc` cookie, verbatim. Null when they did not arrive from an ad. */
  fbc: string | null;
}

/**
 * Normalise, then hash.
 *
 * Meta matches on the hash, so the normalisation is not cosmetic: "Rahim" and
 * "rahim " produce different digests and therefore different people. Every
 * rule below is Meta's, not ours, and an empty input yields nothing at all
 * rather than the hash of an empty string — which would match every other
 * advertiser who made the same mistake.
 */
function hash(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return createHash("sha256").update(trimmed, "utf8").digest("hex");
}

/**
 * A Bangladeshi mobile in the form Meta wants: country code, digits only.
 *
 * `01799000111` on the order becomes `8801799000111`. No `+`, no `00`, no
 * leading zero — Meta's rule is "remove symbols, letters, and any leading
 * zeros" and the country code is required even when every customer is in the
 * same country.
 */
function metaPhone(input: string): string | undefined {
  const local = canonicalPhone(input);
  if (!/^01[3-9]\d{8}$/.test(local)) return undefined;
  return `880${local.slice(1)}`;
}

/** First word and the rest. Crude, and the only thing a single name field
    supports — better than sending nothing, which matches nobody. */
function splitName(full: string): { first?: string; last?: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { first: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/** Drops keys with no value, so `user_data` never carries empty strings. */
function compact<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ) as Partial<T>;
}

export async function sendPurchaseToMeta(purchase: CapiPurchase): Promise<void> {
  try {
    const config = await getMetaCapiConfig();
    if (!config) return; // No token: the shop has not set this up.

    const { first, last } = splitName(purchase.customerName);

    const userData = compact({
      ph: hash(metaPhone(purchase.customerPhone) ?? ""),
      fn: hash(first ?? ""),
      ln: hash(last ?? ""),
      /*
        Hardcoded, and true: this shop delivers inside Bangladesh only, and the
        delivery areas are "inside Dhaka" and "outside Dhaka". Meta asks for it
        on every event even when every customer is in one country, because it
        narrows the match.

        City is deliberately absent. The address is one free-text box, and
        guessing a city out of it would send Meta a wrong answer confidently —
        worse for matching than sending none.
      */
      country: hash("bd"),
      /*
        Not hashed, by Meta's rule. These are the only two fields that link the
        server event back to the same browser the pixel ran in, which is what
        lets Meta attribute the sale to the advertisement that caused it.
      */
      client_user_agent: purchase.userAgent ?? undefined,
      client_ip_address: purchase.clientIp ?? undefined,
      fbp: purchase.fbp ?? undefined,
      fbc: purchase.fbc ?? undefined,
    });

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: "Purchase",
          // Seconds, not milliseconds. Meta rejects the whole request if any
          // event is more than seven days old, and a millisecond value reads
          // as a date fifty thousand years from now.
          event_time: Math.floor(Date.now() / 1000),
          event_id: purchase.orderNo,
          event_source_url: purchase.eventSourceUrl,
          action_source: "website",
          user_data: userData,
          custom_data: {
            currency: purchase.currency,
            value: purchase.value,
            content_type: "product",
            content_ids: purchase.items.map((i) => i.sku),
            contents: purchase.items.map((i) => ({
              id: i.sku,
              quantity: i.quantity,
              item_price: i.price,
            })),
            /*
              No `num_items`. Meta documents it as an InitiateCheckout
              parameter only; the quantities are in `contents`, where a
              Purchase is supposed to carry them.
            */
            order_id: purchase.orderNo,
          },
        },
      ],
      access_token: config.token,
    };

    /*
      In the body, not the query string. Meta's prose offers both, and a token
      in a URL ends up in nginx's access log, in any proxy in front of it, and
      in whatever ships those logs somewhere else.
    */
    if (config.testEventCode) body.test_event_code = config.testEventCode;

    const response = await fetch(
      `${GRAPH_ORIGIN}/${API_VERSION}/${config.pixelId}/events`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // This is measurement, not data the app reads back. Never let Next
        // cache it, and never let it join a request's cache scope.
        cache: "no-store",
      },
    );

    if (!response.ok) {
      /*
        Logged, not raised, and logged without the token.

        Meta's own Events Manager is where a shop owner sees whether server
        events are arriving — that is the surface they are told to check. This
        line is for whoever has the server logs when the answer is "they are
        not", and it needs the reason Meta gave, which is in the body.
      */
      const detail = await response.text().catch(() => "");
      console.error(
        `[meta-capi] Purchase ${purchase.orderNo} rejected: ${response.status} ${detail.slice(0, 400)}`,
      );
    }
  } catch (error) {
    // Timeouts, DNS, a rate limit, Meta being down. None of it is the
    // customer's problem and none of it may surface as one.
    console.error(
      `[meta-capi] Purchase ${purchase.orderNo} not sent:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Does this token actually work for this pixel?
 *
 * A read, not a send: it asks Meta for the dataset's own name. Nothing is
 * recorded, no event is created, and the answer distinguishes the three
 * failures a shop owner cannot otherwise tell apart — a token that has
 * expired, a token that belongs to a different pixel, and a pixel ID with a
 * digit wrong in it.
 *
 * Without this, the only way to find out a token is dead is to notice, weeks
 * later, that Meta has been missing sales.
 */
export async function checkMetaCapiToken(): Promise<
  { ok: true; datasetName: string } | { ok: false; reason: string }
> {
  const config = await getMetaCapiConfig();
  if (!config) {
    return {
      ok: false,
      reason: "There is no token saved yet, or the Pixel ID is not 15 or 16 digits. Save both first, then check.",
    };
  }

  try {
    const response = await fetch(
      `${GRAPH_ORIGIN}/${API_VERSION}/${config.pixelId}?fields=name&access_token=${encodeURIComponent(config.token)}`,
      { method: "GET", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" },
    );
    const payload = (await response.json().catch(() => null)) as
      | { name?: string; error?: { message?: string } }
      | null;

    if (!response.ok) {
      /*
        Meta's own words, passed through. They are written for developers, but
        they are specific — "Unsupported get request" means this token cannot
        see this pixel, which is a different problem from an expired one, and
        paraphrasing that away would leave the client guessing.
      */
      return {
        ok: false,
        reason: payload?.error?.message ?? `Meta refused the check (${response.status}).`,
      };
    }
    return { ok: true, datasetName: payload?.name ?? config.pixelId };
  } catch {
    return {
      ok: false,
      reason: "Could not reach Meta. Check the server's internet connection and try again.",
    };
  }
}
