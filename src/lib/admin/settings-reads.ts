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

export interface AdminSetting {
  key: string;
  value: string;
  type: SettingType;
  label: string;
  helpText: string | null;
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
