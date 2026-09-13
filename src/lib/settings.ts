import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/**
 * Editable settings, read from the database.
 *
 * These were seeded from `src/data/site.ts` and are the same numbers the UI
 * still displays from that file. The difference is authority: from here on the
 * *server* decides what an order costs, and it decides from a row the shop
 * owner can change — not from a constant compiled into the bundle a shopper
 * downloaded some time ago.
 *
 * Phase 5 gives the client a form for these and removes the delivery values
 * from `src/data/site.ts` entirely. Until then the two agree because one was
 * seeded from the other, and the only one that can charge anybody is this one.
 */

export const SETTINGS_TAG = "settings";

/** One year. Invalidation is by tag, not by clock. */
const CACHE = { revalidate: 31_536_000 } as const;

export interface DeliverySettings {
  insideDhaka: number;
  outsideDhaka: number;
  /** Goods subtotal above which delivery is free. */
  freeThreshold: number;
}

/**
 * Defaults matching the seed, used only if a row is missing.
 *
 * A missing setting must not mean free delivery. Falling back to zero would
 * turn a typo in a settings key into a silent discount on every order in the
 * country, which is the sort of bug that is only ever found in the accounts.
 */
const FALLBACK: DeliverySettings = {
  insideDhaka: 60,
  outsideDhaka: 120,
  freeThreshold: 3000,
};

export const getDeliverySettings = unstable_cache(
  async (): Promise<DeliverySettings> => {
    const rows = await db.setting.findMany({
      where: { key: { in: ["delivery.insideDhaka", "delivery.outsideDhaka", "delivery.freeThreshold"] } },
      select: { key: true, value: true },
    });

    const read = (key: string, fallback: number) => {
      const raw = rows.find((r) => r.key === key)?.value;
      const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };

    return {
      insideDhaka: read("delivery.insideDhaka", FALLBACK.insideDhaka),
      outsideDhaka: read("delivery.outsideDhaka", FALLBACK.outsideDhaka),
      freeThreshold: read("delivery.freeThreshold", FALLBACK.freeThreshold),
    };
  },
  ["settings:delivery"],
  { ...CACHE, tags: [SETTINGS_TAG] },
);
