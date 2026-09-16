"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { assertSettingsAccess } from "@/lib/admin/access";
import { recordAudit } from "@/lib/admin/audit";
import { SETTINGS_TAG } from "@/lib/settings";
import { isBDMobile, normalisePhone } from "@/lib/phone";
import { checkMetaCapiToken } from "@/lib/meta-capi";
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
    Some settings may be blank, and blank is meaningful.

    For the social links it means "we are not on that one", and the footer then
    renders no icon rather than a dead one. For everything under `tracking.` it
    is the off switch — clearing the box is how the shop stops loading that
    tag, or stops sending to Meta from the server, and is the answer to "can we
    turn this off again". The exception is who sends the Meta events, which is
    a choice between two things rather than a thing that can be absent.

    Every other setting is load-bearing and an empty value would be a silent
    hole in the shop.
  */
  if (!trimmed) {
    const blankable =
      key.startsWith("social.") ||
      (key.startsWith("tracking.") && key !== "tracking.metaEventsVia");
    return blankable ? null : "This cannot be left blank.";
  }

  /*
    Shape checks, not existence checks — nothing here can tell whether the
    container actually exists. They catch the mistakes that are actually made:
    pasting the whole snippet instead of the id, pasting an ad-account number
    instead of a pixel id, or a stray space that makes the script request a
    container that is not theirs.

    They are also what keeps these safe to write into an inline <script>. The
    patterns admit only word characters and hyphens, so there is no way to
    close the tag from inside a settings field.
  */
  if (key === "tracking.gtmId" && !/^GTM-[A-Z0-9]{4,}$/.test(trimmed)) {
    return "That is not a container ID. Paste just the GTM-XXXXXXX part from Tag Manager, not the whole snippet.";
  }

  if (key === "tracking.metaPixelId" && !/^\d{15,16}$/.test(trimmed)) {
    return "A pixel ID is 15 or 16 digits with nothing else in it. Copy it from Events Manager → Data sources.";
  }

  /*
    Not a shape Meta publishes, so this is the loosest check that still catches
    the mistake people actually make: pasting the Pixel ID, an App ID, or the
    whole curl command Events Manager shows next to the token. A real System
    User token is a long opaque string and has always begun `EAA` in practice —
    but that prefix is not documented, so it is not required here. Refusing a
    token that works would be worse than accepting one that does not: the
    "Check the saved token" button answers the second case in one click.
  */
  if (key === "tracking.metaCapiToken") {
    if (/\s/.test(trimmed)) {
      return "That has a space in it, so something else came along with the token. Copy just the token.";
    }
    if (trimmed.length < 40) {
      return "That is too short to be an access token. In Events Manager open your dataset, then Settings, then Conversions API, and generate one.";
    }
  }

  if (key === "tracking.metaTestEventCode" && !/^TEST\w+$/.test(trimmed)) {
    return "A test event code looks like TEST12345, from the Test events tab. Clear the box when you have finished testing.";
  }

  if (key === "tracking.metaEventsVia" && trimmed !== "direct" && trimmed !== "gtm") {
    return "Type either “direct” (this site sends the events) or “gtm” (a Tag Manager tag sends them). Choosing both counts every sale twice.";
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

  /*
    One check that no single field can make.

    "Tag Manager sends the events" plus no Tag Manager container is a shop that
    has a pixel ID filled in, believes it is measuring, and is measuring
    nothing — the worst of the three possible states, because it looks like the
    working one from this form. Caught here rather than left to be discovered
    in Events Manager a fortnight into a campaign.
  */
  const after = (key: string) =>
    changes.find((c) => c.key === key)?.to ??
    rows.find((r) => r.key === key)?.value ??
    "";

  if (after("tracking.metaPixelId") && after("tracking.metaEventsVia") === "gtm" && !after("tracking.gtmId")) {
    return {
      ok: false,
      message:
        "You have a Pixel ID but nothing would send to it: the events are set to go through Google Tag Manager, and there is no container ID. Either add the container ID, or set the shop to send the events itself.",
    };
  }

  if (changes.length === 0) return { ok: true };

  await db.$transaction(
    changes.map((c) =>
      db.setting.update({ where: { key: c.key }, data: { value: c.to } }),
    ),
  );

  /*
    The audit trail says what changed, and for a secret that is all it says.

    Writing the before and after of an access token into an append-only table
    that the panel displays would undo the entire point of not sending it to
    the browser in the first place — and an audit row, by design, is never
    edited or deleted afterwards.
  */
  const secretKeys = new Set(
    rows.filter((r) => r.type === "SECRET").map((r) => r.key),
  );
  await recordAudit(
    actor,
    "settings.updated",
    changes.map((c) => c.key).join(", "),
    changes
      .map((c) =>
        secretKeys.has(c.key)
          ? `${c.label}: ${c.to ? "replaced" : "removed"}`
          : `${c.label}: “${c.from}” → “${c.to}”`,
      )
      .join("; "),
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

/**
 * "Does this token work?", answered without waiting for a sale.
 *
 * An access token is the one setting on this panel whose correctness cannot be
 * seen. A wrong phone number is obvious on the contact page; a wrong delivery
 * charge shows up in the next order. A dead or mismatched Conversions API
 * token looks exactly like a working one until someone notices, weeks later,
 * that Meta has been recording fewer sales than the shop has.
 *
 * So this asks Meta for the dataset's own name. It sends no event and records
 * nothing — it only proves that this token can see this pixel.
 *
 * Owner-only, like the form it sits in, and it reads the saved token rather
 * than one typed into the box: checking a token that has not been saved would
 * report on something the shop is not actually using.
 */
export async function verifyMetaCapiToken(): Promise<{ ok: boolean; message: string }> {
  await assertSettingsAccess();
  const result = await checkMetaCapiToken();
  return result.ok
    ? { ok: true, message: `Meta accepted the token. It is connected to "${result.datasetName}".` }
    : { ok: false, message: result.reason };
}
