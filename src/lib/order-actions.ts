"use server";

import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/dal";
import { grantOrderAccess } from "@/lib/order-access";
import { getDeliverySettings } from "@/lib/settings";
import { CATALOG_TAG, PRODUCTS_TAG } from "@/lib/catalog";
import { isBDMobile, normalisePhone } from "@/lib/phone";
import { DeliveryArea as PrismaArea } from "@prisma/client";
import type { DeliveryArea } from "@/lib/orders";
import type { PlaceOrderInput, PlaceOrderLine, PlaceOrderResult } from "@/lib/order-types";
import { getViewerOrders, lookupOrder, type OrderView } from "@/lib/order-reads";
import { consume } from "@/lib/redis";
import { headers } from "next/headers";

/**
 * Who is asking, for rate limiting.
 *
 * `x-forwarded-for` is the client's address behind the reverse proxy this
 * shop is deployed behind; the first entry is the original client and the
 * rest are proxies. It is spoofable by anyone who can reach the app directly,
 * which is why the proxy must be the only thing that can — the same
 * assumption better-auth's own limiter already makes here.
 */
async function callerKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
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
  const rate = await consume(`order:${await callerKey()}`, 600, 8);
  if (rate && !rate.allowed) {
    return {
      ok: false,
      message: `That is a lot of orders at once. Try again in ${Math.ceil(rate.retryAfter / 60)} minutes, or call us and we will place it for you.`,
    };
  }

  /* --- 1. the details, checked again ------------------------------------ */

  const name = input.name.trim();
  const phone = normalisePhone(input.phone);
  const altPhone = input.altPhone ? normalisePhone(input.altPhone) : "";
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
  const deliveryCharge =
    subtotal >= settings.freeThreshold
      ? 0
      : input.area === "inside-dhaka"
        ? settings.insideDhaka
        : settings.outsideDhaka;
  const total = subtotal + deliveryCharge;

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
            deliveryCharge,
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
  const rate = await consume(`track:${await callerKey()}`, 300, 12);
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
 * Orders this browser has placed, or this customer's if signed in.
 *
 * Scoped entirely by the caller's own cookies, so there is nothing to
 * authorise: it can only ever return what the caller already had access to.
 */
export async function myRecentOrders(): Promise<OrderView[]> {
  return getViewerOrders(5);
}
