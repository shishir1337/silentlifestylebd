import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { MetaEventsVia } from "@/types/settings";

/**
 * What the shop tells the ad platforms.
 *
 * Four moments matter to somebody running Meta ads to a product page: the page
 * was looked at, the item went in the bag, checkout was started, and an order
 * was placed. Everything here exists to report those four honestly.
 *
 * Every event goes to `dataLayer` first, always, even when nothing is
 * configured. That is deliberate: `dataLayer` is a plain array until Tag
 * Manager arrives and adopts it, so a shop can be wired up months later and
 * the events are already being published for whatever is listening. Pushing to
 * an array costs nothing and it is the difference between "add a container ID"
 * and "hire a developer again".
 *
 * Then, and only when the shop is set to send them itself, the same event goes
 * to the Meta Pixel. The alternative is that a Tag Manager tag sends it — and
 * if both do, Meta counts every sale twice. See `metaEventsVia`.
 *
 * Nothing in here throws. An ad tag that breaks a checkout has cost the shop
 * far more than the measurement was ever worth, so every call is wrapped and
 * every failure is silent.
 */

/** One line of an order, in the shape both platforms want. */
export interface TrackItem {
  /**
   * The SKU, not the database id.
   *
   * Whatever goes here has to match the `id` column of the product catalogue
   * uploaded to Meta and Google, or the events arrive attached to no product
   * and dynamic ads have nothing to retarget with. The SKU is the only field
   * this shop has that a spreadsheet exported for a catalogue would also have.
   */
  sku: string;
  name: string;
  /** Category slug, or absent when the caller does not know it. */
  category?: string;
  /** Unit price in whole taka. */
  price: number;
  quantity: number;
}

const CURRENCY = "BDT";

interface TrackingGlobals {
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
  /** Written by the inline bootstrap in `<SiteTracking>`. */
  slbdTracking?: { meta: MetaEventsVia | "off" };
}

function globals(): TrackingGlobals | null {
  return typeof window === "undefined" ? null : (window as unknown as TrackingGlobals);
}

/**
 * A different id for every event, shared between browser and server.
 *
 * Meta deduplicates a browser event against a Conversions API event when the
 * browser's `eventID` equals the server's `event_id`, within 48 hours. Nothing
 * sends server-side yet, but the ids are emitted now so that turning CAPI on
 * later is a server change only — retrofitting ids afterwards would mean a
 * window where every conversion is counted twice.
 */
function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const sum = (items: TrackItem[]) =>
  items.reduce((n, i) => n + i.price * i.quantity, 0);

/**
 * The event, twice: once for Meta and once for Google Analytics.
 *
 * The two want the same facts in different words — Meta wants `content_ids`
 * and `contents`, GA4 wants `ecommerce.items` — and a tag manager cannot
 * invent either from the other. Publishing both means whoever wires this up
 * later maps fields rather than writes code, whichever platform they start
 * with.
 */
function payload(items: TrackItem[], value: number) {
  return {
    currency: CURRENCY,
    value,
    // --- Meta -------------------------------------------------------------
    content_type: "product",
    content_ids: items.map((i) => i.sku),
    contents: items.map((i) => ({
      id: i.sku,
      quantity: i.quantity,
      item_price: i.price,
    })),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
    // --- GA4 --------------------------------------------------------------
    ecommerce: {
      currency: CURRENCY,
      value,
      items: items.map((i, index) => ({
        item_id: i.sku,
        item_name: i.name,
        item_category: i.category,
        price: i.price,
        quantity: i.quantity,
        index,
      })),
    },
  };
}

function send(
  event: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase",
  items: TrackItem[],
  value: number,
  eventId: string,
) {
  const w = globals();
  if (!w) return;

  try {
    const data = payload(items, value);

    /*
      `ecommerce: null` first, every time.

      `dataLayer` is cumulative — a variable read from a later push still sees
      the keys an earlier one set. Without this, a Purchase of one shirt that
      follows an AddToCart of three would report whichever items Tag Manager
      happened to resolve. Google documents the clear, and the bug it prevents
      is the kind nobody notices until the revenue numbers are questioned.
    */
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ ecommerce: null });
    w.dataLayer.push({ event, eventID: eventId, ...data });

    // Only when nothing else is doing it. Both would double every figure.
    if (w.slbdTracking?.meta === "direct" && typeof w.fbq === "function") {
      w.fbq(
        "track",
        event,
        {
          currency: data.currency,
          value: data.value,
          content_type: data.content_type,
          content_ids: data.content_ids,
          contents: data.contents,
          ...(event === "InitiateCheckout" ? { num_items: data.num_items } : {}),
        },
        { eventID: eventId },
      );
    }
  } catch {
    // Measurement is never worth an exception on the path to an order.
  }
}

/** A product page was opened. */
export function trackViewContent(item: TrackItem): void {
  send("ViewContent", [item], item.price * item.quantity, newEventId());
}

/** Something went into the bag — from the product page or from a card. */
export function trackAddToCart(item: TrackItem): void {
  send("AddToCart", [item], item.price * item.quantity, newEventId());
}

/** The checkout form was reached with a bag in hand. */
export function trackInitiateCheckout(items: TrackItem[]): void {
  if (items.length === 0) return;
  send("InitiateCheckout", items, sum(items), newEventId());
}

/**
 * An order exists.
 *
 * Reported once per order number, ever, on this browser. The confirmation page
 * is a real URL: it is refreshed by anxious customers, reopened from the order
 * history, and shared with whoever is paying. Without the guard each of those
 * is another Purchase, and a shop cannot tell an inflated conversion count
 * from a good week.
 *
 * `orderNo` is the event id as well, so that a Conversions API call made from
 * the server for the same order deduplicates against this one rather than
 * adding to it.
 *
 * `value` is the total the customer hands over, delivery included — the figure
 * on their invoice, and the only one that can be reconciled against the
 * shop's own books later.
 */
export function trackPurchase(
  orderNo: string,
  items: TrackItem[],
  value: number,
): void {
  if (!orderNo || alreadyReported(orderNo)) return;
  markReported(orderNo);
  send("Purchase", items, value, orderNo);
}

/*
  The guard, in localStorage rather than sessionStorage: a confirmation link
  opened in a second tab is a second session but the same sale.

  Capped, because this list would otherwise grow for the life of the browser.
  Twenty is far more than the number of orders anyone places between the sale
  and the last plausible refresh of its confirmation page.
*/
const REPORTED_LIMIT = 20;

function reported(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.tracked);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    // Private mode, a blocked origin, or somebody else's JSON under our key.
    return [];
  }
}

function alreadyReported(orderNo: string): boolean {
  return reported().includes(orderNo);
}

function markReported(orderNo: string): void {
  try {
    const next = [orderNo, ...reported().filter((n) => n !== orderNo)].slice(
      0,
      REPORTED_LIMIT,
    );
    window.localStorage.setItem(STORAGE_KEYS.tracked, JSON.stringify(next));
  } catch {
    // Can't remember it. Reporting a sale twice is better than not at all.
  }
}
