"use server";

import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/dal";
import { grantOrderAccess } from "@/lib/order-access";
import { getDeliverySettings } from "@/lib/settings";
import { baseDelivery, quoteCoupon } from "@/lib/coupons";
import { CATALOG_TAG, PRODUCTS_TAG } from "@/lib/catalog";
import { canonicalPhone, isBDMobile } from "@/lib/phone";
import { DeliveryArea as PrismaArea } from "@prisma/client";
import type { DeliveryArea } from "@/lib/orders";
import type { PlaceOrderInput, PlaceOrderLine, PlaceOrderResult } from "@/lib/order-types";
import { getViewerOrders, lookupOrder, type OrderView } from "@/lib/order-reads";
import { consume } from "@/lib/redis";
import { clientIp } from "@/lib/client-ip";
import { headers } from "next/headers";

/**
 * Who is asking, for rate limiting — or null when that cannot be established.
 *
 * See `client-ip.ts` for why this is not simply the first entry of
 * `x-forwarded-for`, and for what "trusted" means here.
 *
 * Null is a real answer and each caller below handles it deliberately, because
 * the safe failure is different for each one. Collapsing it to a placeholder
 * string would put every stranger in the world in one shared bucket, which is
 * the right call for a lookup that leaks addresses and the wrong one for a
 * customer trying to buy something.
 */
async function callerKey(): Promise<string | null> {
  return clientIp(await headers());
}

/**
 * Said once per process, not once per request.
 *
 * An unresolvable caller means the deployment is wrong — no reverse proxy, or
 * `TRUSTED_PROXIES` does not describe it — and it silently changes what every
 * limiter in this file does. It has to be visible in the logs without
 * drowning them.
 */
let warnedAboutIp = false;
function warnOnce(): void {
  if (warnedAboutIp) return;
  warnedAboutIp = true;
  console.error(
    "[rate-limit] cannot identify the caller: no usable address in " +
      "x-forwarded-for. Check that the reverse proxy sets it and that " +
      "TRUSTED_PROXIES matches the hops in front of this app.",
  );
}

/**
 * Placing an order.
 *
 * The browser sends what the customer *wants*: which product, which size, how
 * many, and where to deliver it. Everything else — every price, the delivery
 * charge, the total, the order number, whether the stock exists at all — is
 * decided here, from the database, and the numbers that arrived from the
 * client are never read.
 *
 * That is not paranoia about a hostile shopper. It is that the cart lives in
 * `localStorage`, so a price in it may simply be *old*: a shopper who added a
 * panjabi last week and checks out today would otherwise pay last week's
 * price, and nobody would notice until the accounts did not add up.
 */

/** Alphabet without 0/O and 1/I: these get read out over the phone. */
const ALPHABET = "23456789ACDEFGHJKLMNPQRTUVWXYZ";
const MAX_ATTEMPTS = 5;

function mintOrderNo(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  let tail = "";
  for (let i = 0; i < 4; i += 1) {
    tail += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `SLB-${yy}${mm}${dd}-${tail}`;
}

const toPrismaArea = (a: DeliveryArea): PrismaArea =>
  a === "inside-dhaka" ? PrismaArea.INSIDE_DHAKA : PrismaArea.OUTSIDE_DHAKA;

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  /* --- 0. not a hundred of them ----------------------------------------- */

  /*
    Generous on purpose: a household ordering three times in an evening is
    normal, and a shop that refuses a real customer to stop a hypothetical
    script has the trade backwards. What this stops is the script — junk orders
    that decrement stock and have to be cancelled one at a time in the morning.

    Fails *open*. An order that cannot be placed is a sale lost for certain,
    against abuse that is only possible while Redis is down.
  */
  const who = await callerKey();
  if (!who) warnOnce();
  /*
    An unidentifiable caller is not counted at all, rather than counted in a
    bucket shared with everybody else. Eight orders per ten minutes across the
    entire shop would refuse real customers on the first busy evening, and the
    thing this limit protects against — a script filing junk orders — is worth
    less than the sales that would cost.
  */
  const rate = who ? await consume(`order:${who}`, 600, 8) : null;
  if (rate && !rate.allowed) {
    return {
      ok: false,
      message: `That is a lot of orders at once. Try again in ${Math.ceil(rate.retryAfter / 60)} minutes, or call us and we will place it for you.`,
    };
  }

  /* --- 1. the details, checked again ------------------------------------ */

  const name = input.name.trim();
  // Canonical, not merely tidied: this is the string the customer will be
  // asked for again on the tracking page, and the one `perPhoneLimit` counts.
  const phone = canonicalPhone(input.phone);
  const altPhone = input.altPhone ? canonicalPhone(input.altPhone) : "";
  const address = input.address.trim();

  if (name.length < 3) return { ok: false, message: "Enter your full name." };
  if (!isBDMobile(phone)) {
    return { ok: false, message: "Enter an 11-digit mobile number starting with 01." };
  }
  if (altPhone && !isBDMobile(altPhone)) {
    return { ok: false, message: "The alternative number is not a valid mobile number." };
  }
  if (address.length < 10) {
    return { ok: false, message: "Add house or flat, road and area so we can find you." };
  }
  if (input.lines.length === 0) {
    return { ok: false, message: "Your bag is empty." };
  }

  /**
   * Collapse duplicates before pricing.
   *
   * Two lines for the same product and size would each pass their own stock
   * check and then decrement twice — a way to buy two of the last one.
   */
  const wanted = new Map<string, PlaceOrderLine>();
  for (const line of input.lines) {
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1) {
      return { ok: false, message: "One of the quantities is not valid." };
    }
    // A cap, because nothing stops a client sending 100,000 of something.
    if (qty > 50) {
      return { ok: false, message: "Ordering more than 50 of one item? Please call us." };
    }
    const key = `${line.productId} ${line.size ?? ""}`;
    const seen = wanted.get(key);
    wanted.set(key, {
      productId: line.productId,
      size: line.size ?? "",
      qty: (seen?.qty ?? 0) + qty,
    });
  }

  /* --- 2. price it from the database ------------------------------------ */

  const products = await db.product.findMany({
    where: { id: { in: [...new Set([...wanted.values()].map((l) => l.productId))] }, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      variants: { select: { id: true, size: true, stock: true } },
      images: {
        where: { role: "PRIMARY" },
        take: 1,
        select: { asset: { select: { url: true } } },
      },
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const unavailable: { productId: string; size: string; available: number }[] = [];
  const priced: {
    productId: string;
    variantId: string;
    name: string;
    slug: string;
    size: string;
    unitPrice: number;
    qty: number;
    imageUrl: string;
  }[] = [];

  for (const line of wanted.values()) {
    const product = byId.get(line.productId);
    // Unknown or unpublished: report it as unavailable rather than explaining
    // the difference, which is nobody's business but the shop's.
    if (!product) {
      unavailable.push({ productId: line.productId, size: line.size, available: 0 });
      continue;
    }

    const variant = product.variants.find((v) => v.size === line.size);
    if (!variant || variant.stock < line.qty) {
      unavailable.push({
        productId: line.productId,
        size: line.size,
        available: variant?.stock ?? 0,
      });
      continue;
    }

    priced.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      slug: product.slug,
      size: line.size,
      // The price as it is *now*, never the one the browser sent.
      unitPrice: product.price,
      qty: line.qty,
      imageUrl: product.images[0]?.asset.url ?? "",
    });
  }

  if (unavailable.length > 0) {
    return {
      ok: false,
      message:
        unavailable.length === 1
          ? "One item in your bag has just sold out. Remove it to continue."
          : "Some items in your bag have just sold out. Remove them to continue.",
      unavailable,
    };
  }

  const subtotal = priced.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const settings = await getDeliverySettings();
  /**
   * The free-delivery threshold applies to the goods subtotal, never the
   * total — otherwise the charge could push an order over the line and pay for
   * its own removal.
   */
  const deliveryCharge = baseDelivery(input.area, subtotal, settings);

  /* --- 2b. the coupon, priced here and nowhere else --------------------- */

  /*
    Quoted once outside the transaction so a refusal is a plain message rather
    than a rolled-back order, then *checked again inside it* — between the two,
    a limited code can be spent by somebody else, or the same customer can
    submit twice from two tabs.

    A code that has gone stale between the two does not lose the order. The
    customer is told and the order is placed at full price, because an order
    is worth more than a discount, and the alternative is a form that throws
    away a filled-in address over a coupon.
  */
  let quote = input.couponCode
    ? await quoteCoupon({
        code: input.couponCode,
        subtotal,
        area: input.area,
        phone,
        rates: settings,
      })
    : null;

  if (quote && !quote.ok) {
    return { ok: false, message: quote.message, couponRejected: true };
  }

  /* --- 3. write it, or write nothing ------------------------------------ */

  const session = await getSession();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const orderNo = mintOrderNo();

    try {
      await db.$transaction(async (tx) => {
        for (const line of priced) {
          /**
           * Decrement conditionally, in one statement.
           *
           * `stock: { gte: qty }` in the WHERE is what makes this safe: two
           * customers racing for the last shirt both passed the check in step
           * 2, and exactly one of them matches a row here. Reading the stock
           * and then writing it back would let both through.
           */
          const { count } = await tx.productVariant.updateMany({
            where: { id: line.variantId, stock: { gte: line.qty } },
            data: { stock: { decrement: line.qty } },
          });
          if (count !== 1) {
            // Rolls back every decrement already made in this transaction.
            throw new SoldOut(line.productId, line.size);
          }
        }

        /*
          The coupon again, against the same rows the order is about to be
          written from — and, where the code has a total limit, claimed with a
          conditional update. `usageCount: { lt: usageLimit }` in the WHERE is
          what stops two customers racing for the last redemption: both passed
          the quote above, and exactly one of them matches a row here.
        */
        let discount = 0;
        let charged = deliveryCharge;
        let couponId: string | null = null;
        let couponCode: string | null = null;

        if (quote?.ok) {
          const fresh = await quoteCoupon({
            code: quote.code,
            subtotal,
            area: input.area,
            phone,
            rates: settings,
            client: tx,
          });

          if (fresh.ok) {
            const claimed = await tx.coupon.updateMany({
              where: {
                id: fresh.couponId,
                isActive: true,
                OR: [
                  { usageLimit: 0 },
                  { usageCount: { lt: tx.coupon.fields.usageLimit } },
                ],
              },
              data: { usageCount: { increment: 1 } },
            });

            if (claimed.count === 1) {
              discount = fresh.discount;
              charged = fresh.deliveryCharge;
              couponId = fresh.couponId;
              couponCode = fresh.code;
            } else {
              // Somebody took the last one in the last few milliseconds. The
              // order still goes through, at full price.
              quote = { ok: false, reason: "used-up", message: "That code has been fully used." };
            }
          } else {
            quote = fresh;
          }
        }

        const total = subtotal - discount + charged;

        const order = await tx.order.create({
          data: {
            orderNo,
            customerId: session?.id ?? null,
            customerName: name,
            customerPhone: phone,
            altPhone: altPhone || null,
            address,
            note: input.note?.trim() || null,
            area: toPrismaArea(input.area),
            subtotal,
            discount,
            couponId,
            couponCode,
            deliveryCharge: charged,
            total,
            items: {
              create: priced.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                name: l.name,
                slug: l.slug,
                // Null, not "", for a product sold without a size — the column
                // is nullable and an empty string would render as a blank size.
                size: l.size || null,
                unitPrice: l.unitPrice,
                qty: l.qty,
                imageUrl: l.imageUrl,
              })),
            },
            events: {
              create: {
                toStatus: "PENDING",
                note: session ? "Placed by a signed-in customer." : "Placed as a guest.",
              },
            },
          },
          select: { id: true },
        });

        return order;
      });

      // Only after the transaction commits: a cookie granting access to an
      // order that was rolled back would point at nothing.
      await grantOrderAccess(orderNo);

      /**
       * Stock just changed, and product pages are prerendered from it.
       *
       * `"max"` rather than an immediate expiry: the next shopper is served
       * the old page while a fresh one is built behind them, which is the
       * right trade because the cached page is not what decides whether an
       * order goes through. This action is, and it has already proven it
       * refuses a size that has run out.
       *
       * Without this, a size stays "available" on a static page until the
       * next deploy — the customer picks it, fills in their address, and only
       * then finds out. Selling out is not only an admin action.
       */
      revalidateTag(PRODUCTS_TAG, "max");
      revalidateTag(CATALOG_TAG, "max");

      return { ok: true, orderNo };
    } catch (error) {
      if (error instanceof SoldOut) {
        return {
          ok: false,
          message: "Someone just took the last one. Refresh your bag and try again.",
          unavailable: [{ productId: error.productId, size: error.size, available: 0 }],
        };
      }

      /**
       * P2002 is a unique-constraint violation, which here means two orders
       * minted the same number in the same second. Retry with a new one.
       *
       * The old client-side minter had no check at all and would have silently
       * overwritten the earlier order under the same key.
       */
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (collision && attempt < MAX_ATTEMPTS) continue;

      console.error("[order] placement failed:", error);
      return {
        ok: false,
        message: "Something went wrong placing your order. Please try again.",
      };
    }
  }

  return {
    ok: false,
    message: "Could not generate an order number. Please try again.",
  };
}

/** Thrown inside the transaction so the decrements already made roll back. */
class SoldOut extends Error {
  constructor(
    readonly productId: string,
    readonly size: string,
  ) {
    super("sold out");
  }
}

/* --- lookups the browser is allowed to make ------------------------------- */

/**
 * Public order tracking: order number **and** the phone it was placed with.
 *
 * Deliberately an action rather than a page read, so `/track` stays a static
 * page. Requiring both is the whole security model for a guest — an order
 * number is short enough to guess and is designed to be read aloud, and a
 * phone number is eleven digits with a known prefix. Together they are a
 * reasonable proof; apart they are neither.
 */
export async function trackOrder(
  orderNo: string,
  phone: string,
): Promise<TrackResult> {
  /*
    This one is guessable, so this one is counted.

    An order number is four random characters on a known date, and a
    Bangladeshi mobile is eleven digits with a known prefix. Together they are
    a reasonable proof for a guest — but only while a stranger cannot sit there
    trying combinations. Twelve attempts in five minutes is far more than a
    customer reading their own confirmation aloud needs.

    Fails *closed*, which is the opposite of placing an order and for a good
    reason: what is behind this is other people's names, phone numbers and home
    addresses. If the counters are unavailable, "call us" costs the shop a
    phone call; guessing unchecked costs a customer their address.
  */
  const who = await callerKey();
  if (!who) warnOnce();
  /*
    The opposite choice to placing an order, for the same reason this one
    fails closed: behind here are other people's names, phone numbers and home
    addresses. An unidentifiable caller shares one bucket with every other
    unidentifiable caller — worse for the honest customer, who is told to ring
    the shop, and the only option that does not hand a stranger unlimited
    guesses at somebody's address.
  */
  const rate = await consume(`track:${who ?? "unidentified"}`, 300, 12);
  if (!rate) {
    return {
      ok: false,
      message:
        "We cannot look orders up at the moment. Please call us and we will check it for you.",
    };
  }
  if (!rate.allowed) {
    return {
      ok: false,
      message: `Too many tries. Wait ${Math.ceil(rate.retryAfter / 60)} minutes, or call us and we will check it for you.`,
    };
  }

  return { ok: true, order: await lookupOrder(orderNo, phone) };
}

/**
 * Found, not found, or not right now.
 *
 * `null` used to mean both "no such order" and "we are not going to tell you",
 * which left the tracker unable to say the one thing a blocked customer needs
 * to hear — that the shop can still help on the phone.
 */
export type TrackResult =
  | { ok: true; order: OrderView | null }
  | { ok: false; message: string };

/**
 * What a code would be worth on this basket.
 *
 * For the checkout form, so a customer sees the saving before committing to an
 * address. Deliberately not the decision: `placeOrder` prices the coupon again
 * from the same rows and uses *that*. This is a quote, and it says so.
 *
 * Rate limited, because the field is a free oracle otherwise — a script can
 * sit there trying codes until it finds one, and a discount code is worth
 * money. Twenty tries in five minutes is more than anyone typing by hand.
 */
export async function previewCoupon(input: {
  code: string;
  lines: PlaceOrderLine[];
  area: DeliveryArea;
  phone: string;
}): Promise<{ ok: true; summary: string; discount: number; deliveryCharge: number; total: number } | { ok: false; message: string }> {
  const who = await callerKey();
  if (!who) warnOnce();
  // A discount code is worth money, so this shares the tracker's reasoning:
  // one bucket for everyone we cannot tell apart, rather than none.
  const rate = await consume(`coupon:${who ?? "unidentified"}`, 300, 20);
  if (rate && !rate.allowed) {
    return { ok: false, message: "Too many codes tried. Wait a few minutes." };
  }

  /*
    Priced from the catalogue, not from what the browser says the basket is
    worth. Otherwise the minimum-spend rule is advisory: send a subtotal of
    ten thousand and any code clears it.
  */
  const products = await db.product.findMany({
    where: { id: { in: input.lines.map((l) => l.productId) }, isActive: true },
    select: { id: true, price: true },
  });
  const priceOf = new Map(products.map((p) => [p.id, p.price]));
  const subtotal = input.lines.reduce(
    (sum, l) => sum + (priceOf.get(l.productId) ?? 0) * Math.max(0, l.qty),
    0,
  );
  if (subtotal <= 0) return { ok: false, message: "Your bag is empty." };

  const rates = await getDeliverySettings();
  const quote = await quoteCoupon({
    code: input.code,
    subtotal,
    area: input.area,
    phone: input.phone,
    rates,
  });

  return quote.ok
    ? {
        ok: true,
        summary: quote.summary,
        discount: quote.discount,
        deliveryCharge: quote.deliveryCharge,
        total: quote.total,
      }
    : { ok: false, message: quote.message };
}

/**
 * Orders this browser has placed, or this customer's if signed in.
 *
 * Scoped entirely by the caller's own cookies, so there is nothing to
 * authorise: it can only ever return what the caller already had access to.
 */
export async function myRecentOrders(): Promise<OrderView[]> {
  return getViewerOrders(5);
}
