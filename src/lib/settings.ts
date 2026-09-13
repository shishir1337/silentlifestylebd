import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { DeliverySettings, SiteSettings } from "@/types/settings";

/**
 * Editable settings, read from the database.
 *
 * These began as constants in `src/data/site.ts`. That file no longer holds
 * them: a shop name, a phone number and a delivery charge are the shop's to
 * change, and a number compiled into a bundle a shopper downloaded last week
 * is not a number anyone can change.
 *
 * One cached read for all of them. They are a dozen short strings that are
 * needed together on nearly every page, so splitting them into separate cache
 * entries would buy nothing and give the tag more places to miss.
 */

export const SETTINGS_TAG = "settings";

/** One year. Invalidation is by tag, not by clock. */
const CACHE = { revalidate: 31_536_000 } as const;

export type { DeliverySettings, SiteSettings } from "@/types/settings";

/**
 * Defaults matching the seed, used only when a row is missing.
 *
 * A missing setting must not mean free delivery. Falling back to zero would
 * turn a typo in a settings key into a silent discount on every order in the
 * country, which is the sort of bug that is only ever found in the accounts.
 *
 * The strings matter less, but an empty shop name in a page title is still
 * worse than a stale one.
 */
const FALLBACK: SiteSettings = {
  name: "Silent Lifestyle BD",
  legalName: "Silent Lifestyle BD",
  tagline: "Everyday essentials, quietly well made.",
  description:
    "Shop men's and women's fashion in Bangladesh — panjabi, formal shirts, pants, shoes, watches, belts, wallets and Pakistani ladies collections. Cash on delivery nationwide.",
  phone: "+8801711000000",
  phoneDisplay: "+880 1711-000000",
  email: "hello@silentlifestylebd.com",
  address: "Bashundhara City, Panthapath, Dhaka 1215",
  delivery: {
    insideDhaka: 60,
    outsideDhaka: 120,
    freeThreshold: 3000,
    insideDhakaDays: "1–2 days",
    outsideDhakaDays: "2–4 days",
    returnWindowDays: 7,
  },
};

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const rows = await db.setting.findMany({ select: { key: true, value: true } });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));

    const text = (key: string, fallback: string) => {
      const raw = byKey.get(key)?.trim();
      return raw ? raw : fallback;
    };

    const int = (key: string, fallback: number) => {
      const n = Number.parseInt(byKey.get(key) ?? "", 10);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };

    const f = FALLBACK;
    return {
      name: text("site.name", f.name),
      legalName: text("site.legalName", f.legalName),
      tagline: text("site.tagline", f.tagline),
      description: text("site.description", f.description),
      phone: text("site.phone", f.phone),
      phoneDisplay: text("site.phoneDisplay", f.phoneDisplay),
      email: text("site.email", f.email),
      address: text("site.address", f.address),
      delivery: {
        insideDhaka: int("delivery.insideDhaka", f.delivery.insideDhaka),
        outsideDhaka: int("delivery.outsideDhaka", f.delivery.outsideDhaka),
        freeThreshold: int("delivery.freeThreshold", f.delivery.freeThreshold),
        insideDhakaDays: text("delivery.insideDhakaDays", f.delivery.insideDhakaDays),
        outsideDhakaDays: text("delivery.outsideDhakaDays", f.delivery.outsideDhakaDays),
        returnWindowDays: int("delivery.returnWindowDays", f.delivery.returnWindowDays),
      },
    };
  },
  ["settings:site"],
  { ...CACHE, tags: [SETTINGS_TAG] },
);

/**
 * The three numbers that decide what an order costs.
 *
 * A narrow view of the same cached read, kept separate because the checkout
 * action wants to be explicit that it is pricing, not rendering.
 */
export async function getDeliverySettings(): Promise<DeliverySettings> {
  return (await getSiteSettings()).delivery;
}
