"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { assertSettingsAccess } from "@/lib/admin/access";
import { recordAudit } from "@/lib/admin/audit";
import { SETTINGS_TAG } from "@/lib/settings";
import { isBDMobile, normalisePhone } from "@/lib/phone";
import type { SaveResult } from "@/lib/admin/catalog-types";

/**
 * The settings form.
 *
 * Everything here used to be a constant in `src/data/site.ts`, which meant the
 * delivery charge could only be changed by someone who could open a code
 * editor and redeploy the site. These are rows now and this is the form.
 *
 * Two things make it more than a loop over `update`:
 *
 * Validation, because these values are load-bearing. A delivery charge that
 * parses as `NaN` becomes a free delivery on every order in the country, and a
 * phone number with a typo in it is a shop nobody can reach. The rules are the
 * same ones the checkout runs, from the same module.
 *
 * Invalidation across the whole shop, because the header and footer read these
 * in the storefront layout. A tag alone marks the cached read stale; the pages
 * that already rendered with the old numbers need the layout path as well.
 */

/** Keys whose value must be a non-negative whole number, whatever the row says. */
function validate(key: string, type: string, value: string): string | null {
  const trimmed = value.trim();

  /*
    The social links may be blank, and blank is meaningful: it means "we are
    not on that one", and the footer then renders no icon rather than a dead
    one. Every other setting is load-bearing and an empty value would be a
    silent hole in the shop.
  */
  if (!trimmed) {
    return key.startsWith("social.") ? null : "This cannot be left blank.";
  }

  if (key === "social.facebook" || key === "social.instagram") {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return "Paste the whole address, starting with https://";
    }
    if (url.protocol !== "https:") return "The address must start with https://";
    const expected = key === "social.facebook" ? "facebook.com" : "instagram.com";
    if (!url.hostname.endsWith(expected)) {
      return `That is not a ${expected} address.`;
    }
    // The bug this whole field exists to fix: a link to the platform rather
    // than to the shop. A page address has something after the slash.
    if (url.pathname.replace(/\/+$/, "") === "") {
      return `That is ${expected} itself, not your page on it. Open your page and copy the address from the browser.`;
    }
  }

  if (key === "social.whatsapp" && !isBDMobile(trimmed)) {
    return "Use a Bangladeshi mobile number, or leave it blank to use the phone number above.";
  }

  if (type === "INT") {
    if (!/^\d+$/.test(trimmed)) return "Use whole numbers only — no decimals, no symbols.";
    const n = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(n)) return "That number is too large.";
  }

  if (key === "site.phone" && !isBDMobile(trimmed)) {
    return "Use a Bangladeshi mobile number, e.g. +8801711000000.";
  }

  if (key === "site.email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return "That does not look like an email address.";
  }

  if (key === "delivery.returnWindowDays" && Number.parseInt(trimmed, 10) === 0) {
    return "A return window of zero days means no returns. Set at least 1, or say so on the returns page instead.";
  }

  return null;
}

export async function saveSettings(
  values: Record<string, string>,
): Promise<SaveResult> {
  const actor = await assertSettingsAccess();

  const rows = await db.setting.findMany({
    select: { key: true, value: true, type: true, label: true },
  });

  // Only known keys are writable. The form submits what it was given, but a
  // settings table is exactly where an unexpected key would be most useful to
  // an attacker and least visible to everyone else.
  const changes: { key: string; label: string; from: string; to: string }[] = [];
  for (const row of rows) {
    const next = values[row.key];
    if (next === undefined) continue;

    const problem = validate(row.key, row.type, next);
    if (problem) return { ok: false, message: `${row.label}: ${problem}` };

    const to =
      row.key === "site.phone" || row.key === "social.whatsapp"
        ? normalisePhone(next.trim())
        : next.trim();
    if (to !== row.value) {
      changes.push({ key: row.key, label: row.label, from: row.value, to });
    }
  }

  if (changes.length === 0) return { ok: true };

  await db.$transaction(
    changes.map((c) =>
      db.setting.update({ where: { key: c.key }, data: { value: c.to } }),
    ),
  );

  await recordAudit(
    actor,
    "settings.updated",
    changes.map((c) => c.key).join(", "),
    changes.map((c) => `${c.label}: “${c.from}” → “${c.to}”`).join("; "),
  );

  refreshSettings();
  return { ok: true };
}

/**
 * Marks the entire shop stale.
 *
 * Not an over-reach: the header, the footer and the announcement bar all read
 * settings, and they render inside the storefront layout — so every page on
 * the site is showing these numbers whether or not its own content mentions
 * them. `revalidatePath("/", "layout")` is documented to invalidate a layout,
 * the layouts nested under it and every page beneath those, which is exactly
 * the blast radius of a delivery charge.
 */
function refreshSettings() {
  revalidateTag(SETTINGS_TAG, "max");
  revalidatePath("/", "layout");
}
