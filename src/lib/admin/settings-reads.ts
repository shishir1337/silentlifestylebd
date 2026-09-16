import "server-only";

import type { SettingType } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * The settings, arranged the way the form shows them.
 *
 * Grouping and order come from the rows themselves rather than a list in this
 * file. The seed sets `group` and `position`; adding a setting is a row, not a
 * code change, which is the point of a key-value table.
 */

export interface SettingChoice {
  value: string;
  label: string;
  /** What choosing this actually does, in the client's terms. */
  hint: string;
}

export interface AdminSetting {
  key: string;
  value: string;
  type: SettingType;
  label: string;
  helpText: string | null;
  /** When present, the form offers these rather than a free-text box. */
  choices: SettingChoice[] | null;
}

export interface SettingGroup {
  id: string;
  title: string;
  lead: string;
  settings: AdminSetting[];
}

/** Section headings. A group with no entry here still renders, under its key. */
const GROUPS: Record<string, { title: string; lead: string }> = {
  store: {
    title: "Your shop",
    lead: "The name and description search engines show, and the words under your logo.",
  },
  contact: {
    title: "How customers reach you",
    lead: "Shown in the footer, on the contact page and on every order confirmation. The phone number is also the WhatsApp link.",
  },
  delivery: {
    title: "Delivery and returns",
    lead: "These are the numbers customers are charged. Changing one changes every price quote on the shop and every order placed afterwards.",
  },
  tracking: {
    title: "Advertising and analytics",
    lead: "Paste the IDs your marketing people give you, or clear a box to switch that tag off. Leave both blank and the shop loads no tracking at all. Tracking does not report reliably from a developer machine — check it on the live site.",
  },
};

/**
 * Settings whose value is one of a fixed few.
 *
 * The rows carry the value; the words belong here. A key-value table has
 * nowhere to put a list of options, and the alternative was a text box
 * inviting a non-technical client to type `direct` or `gtm` exactly — a
 * setting that breaks on a capital letter is not a setting anyone can use.
 */
const CHOICES: Record<string, SettingChoice[]> = {
  "tracking.metaEventsVia": [
    {
      value: "direct",
      label: "This website",
      hint: "The shop loads the Meta Pixel itself and reports viewed products, bag additions, checkouts and orders straight to Meta. Choose this unless someone has built Meta tags inside Tag Manager for you.",
    },
    {
      value: "gtm",
      label: "Google Tag Manager",
      hint: "The shop only announces each event; your Tag Manager container decides what to do with it. Choose this only if your agency has built Meta tags in GTM — otherwise Meta receives nothing at all.",
    },
  ],
};

export async function listSettings(): Promise<SettingGroup[]> {
  const rows = await db.setting.findMany({
    orderBy: [{ group: "asc" }, { position: "asc" }],
  });

  const order: string[] = [];
  const byGroup = new Map<string, AdminSetting[]>();

  for (const r of rows) {
    if (!byGroup.has(r.group)) {
      byGroup.set(r.group, []);
      order.push(r.group);
    }
    byGroup.get(r.group)!.push({
      key: r.key,
      value: r.value,
      type: r.type,
      label: r.label,
      helpText: r.helpText,
      choices: CHOICES[r.key] ?? null,
    });
  }

  // Show the groups in the order the headings are written, then anything else.
  const known = Object.keys(GROUPS).filter((g) => byGroup.has(g));
  const rest = order.filter((g) => !(g in GROUPS));

  return [...known, ...rest].map((id) => ({
    id,
    title: GROUPS[id]?.title ?? id,
    lead: GROUPS[id]?.lead ?? "",
    settings: byGroup.get(id)!,
  }));
}
