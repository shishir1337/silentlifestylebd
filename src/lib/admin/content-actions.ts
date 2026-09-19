"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { assertContentAccess } from "@/lib/admin/access";
import { CONTENT_TAG } from "@/lib/catalog";
import { slugifySection, type PageBlock } from "@/lib/page-blocks";
import type { SaveResult } from "@/lib/admin/catalog-types";
import {
  MAX_ANNOUNCEMENTS,
  type AnnouncementInput,
  HERO_DESKTOP,
  HERO_MOBILE,
  type HeroSlideInput,
  type NavItemInput,
  type PromoTileInput,
  type SizeChartInput,
} from "@/lib/admin/content-types";

/**
 * Site content the client owns.
 *
 * Banners, tiles, size charts and the menus. All of it used to be a constant in
 * a source file, which meant every change was a developer's afternoon.
 *
 * Each mutation invalidates the content tag and the paths that read it. The
 * homepage needs `revalidatePath` as well as the tag: it is assembled from
 * banners and tiles but lives at a route with no dynamic params, so the tag
 * alone does not mark it stale.
 */

function refreshContent(paths: string[] = []) {
  revalidateTag(CONTENT_TAG, "max");
  revalidatePath("/");
  for (const p of paths) revalidatePath(p);
}

/* --- banners -------------------------------------------------------------- */

/** A little tolerance: exported crops are rarely to the pixel. */
const RATIO_TOLERANCE = 0.04;

function ratioMatches(
  asset: { width: number; height: number },
  target: { width: number; height: number },
): boolean {
  const want = target.width / target.height;
  const got = asset.width / asset.height;
  return Math.abs(got - want) / want <= RATIO_TOLERANCE;
}

export async function saveHeroSlide(input: HeroSlideInput): Promise<SaveResult> {
  await assertContentAccess();

  const alt = input.alt.trim();
  const label = input.label.trim();
  const href = input.href.trim();

  if (!input.desktopAssetId || !input.mobileAssetId) {
    return { ok: false, message: "Choose both pictures — one wide, one tall." };
  }
  if (label.length < 2) return { ok: false, message: "Give the banner a short name." };
  if (alt.length < 5) {
    /**
     * The artwork carries every word of the message, so this is the only
     * machine-readable version of it. Without it a screen reader and Google
     * both see a banner that says nothing at all.
     */
    return {
      ok: false,
      message:
        "Write out what the banner says. It is the only version a screen reader or Google can read.",
    };
  }
  if (!href.startsWith("/")) {
    return { ok: false, message: "The link must be a page on this shop, starting with /." };
  }

  const [desktop, mobile] = await Promise.all([
    db.asset.findUnique({ where: { id: input.desktopAssetId } }),
    db.asset.findUnique({ where: { id: input.mobileAssetId } }),
  ]);
  if (!desktop || !mobile) return { ok: false, message: "One of those pictures is missing." };

  if (!ratioMatches(desktop, HERO_DESKTOP)) {
    return {
      ok: false,
      message: `The wide picture is ${desktop.width}×${desktop.height}. Banners need roughly ${HERO_DESKTOP.width}×${HERO_DESKTOP.height} — a different shape changes the height of the whole carousel.`,
    };
  }
  if (!ratioMatches(mobile, HERO_MOBILE)) {
    return {
      ok: false,
      message: `The tall picture is ${mobile.width}×${mobile.height}. Phone banners need roughly ${HERO_MOBILE.width}×${HERO_MOBILE.height}.`,
    };
  }

  const data = {
    desktopAssetId: input.desktopAssetId,
    mobileAssetId: input.mobileAssetId,
    alt,
    href,
    label,
    isActive: input.isActive,
  };

  const slide = input.id
    ? await db.heroSlide.update({ where: { id: input.id }, data })
    : await db.heroSlide.create({
        data: {
          ...data,
          position:
            ((await db.heroSlide.aggregate({ _max: { position: true } }))._max.position ?? 0) + 1,
        },
      });

  refreshContent();
  return { ok: true, id: slide.id };
}

export async function deleteHeroSlide(id: string): Promise<SaveResult> {
  await assertContentAccess();
  const remaining = await db.heroSlide.count({ where: { isActive: true, id: { not: id } } });
  if (remaining === 0) {
    // An empty carousel renders nothing and the homepage opens on a category
    // rail with no context. Hiding the last one is a decision, not a slip.
    return {
      ok: false,
      message: "This is the last banner on the shop. Add another before removing it.",
    };
  }
  await db.heroSlide.delete({ where: { id } });
  refreshContent();
  return { ok: true };
}

export async function reorderHeroSlides(ids: string[]): Promise<SaveResult> {
  await assertContentAccess();
  await db.$transaction(
    ids.map((id, position) => db.heroSlide.update({ where: { id }, data: { position } })),
  );
  refreshContent();
  return { ok: true };
}

/* --- promo tiles ---------------------------------------------------------- */

export async function savePromoTile(input: PromoTileInput): Promise<SaveResult> {
  await assertContentAccess();

  const title = input.title.trim();
  const href = input.href.trim();
  if (title.length < 2) return { ok: false, message: "Give the tile a title." };
  if (!input.assetId) return { ok: false, message: "Choose a picture." };
  if (!href.startsWith("/")) {
    return { ok: false, message: "The link must be a page on this shop, starting with /." };
  }

  const data = {
    title,
    subtitle: input.subtitle.trim(),
    href,
    cta: input.cta.trim() || "Shop now",
    assetId: input.assetId,
    isActive: input.isActive,
  };

  const tile = input.id
    ? await db.promoTile.update({ where: { id: input.id }, data })
    : await db.promoTile.create({
        data: {
          ...data,
          position:
            ((await db.promoTile.aggregate({ _max: { position: true } }))._max.position ?? 0) + 1,
        },
      });

  refreshContent();
  return { ok: true, id: tile.id };
}

export async function deletePromoTile(id: string): Promise<SaveResult> {
  await assertContentAccess();
  await db.promoTile.delete({ where: { id } });
  refreshContent();
  return { ok: true };
}

export async function reorderPromoTiles(ids: string[]): Promise<SaveResult> {
  await assertContentAccess();
  await db.$transaction(
    ids.map((id, position) => db.promoTile.update({ where: { id }, data: { position } })),
  );
  refreshContent();
  return { ok: true };
}

/* --- size charts ---------------------------------------------------------- */

export async function saveSizeChart(input: SizeChartInput): Promise<SaveResult> {
  await assertContentAccess();

  const title = input.title.trim();
  const columns = input.columns.map((c) => c.trim()).filter(Boolean);
  if (title.length < 2) return { ok: false, message: "Give the chart a title." };
  if (columns.length < 2) return { ok: false, message: "A chart needs at least two columns." };

  /**
   * Rows are padded or trimmed to the column count.
   *
   * A row with the wrong number of cells renders as a broken table on a phone,
   * and the editor lets columns be added after rows exist. Normalising here
   * means the storefront can render `cells` straight into `<td>`s without
   * defending itself.
   */
  const rows = input.rows
    .map((cells) =>
      Array.from({ length: columns.length }, (_, i) => (cells[i] ?? "").trim()),
    )
    .filter((cells) => cells.some(Boolean));

  await db.$transaction(async (tx) => {
    const chart = input.id
      ? await tx.sizeChart.update({
          where: { id: input.id },
          data: { title, note: input.note.trim(), columns, isActive: input.isActive },
        })
      : await tx.sizeChart.create({
          data: {
            slug: input.slug ?? `chart-${Date.now().toString(36)}`,
            title,
            note: input.note.trim(),
            columns,
            isActive: input.isActive,
            position:
              ((await tx.sizeChart.aggregate({ _max: { position: true } }))._max.position ?? 0) + 1,
          },
        });

    // Rows are rebuilt: they carry no identity beyond their order, and diffing
    // a grid the client has just rearranged would be guesswork.
    await tx.sizeChartRow.deleteMany({ where: { chartId: chart.id } });
    if (rows.length > 0) {
      await tx.sizeChartRow.createMany({
        data: rows.map((cells, position) => ({ chartId: chart.id, cells, position })),
      });
    }
  });

  refreshContent(["/size-guide"]);
  return { ok: true };
}

export async function deleteSizeChart(id: string): Promise<SaveResult> {
  await assertContentAccess();
  await db.sizeChart.delete({ where: { id } });
  refreshContent(["/size-guide"]);
  return { ok: true };
}

/* --- navigation ----------------------------------------------------------- */

export async function saveNavItem(input: NavItemInput): Promise<SaveResult> {
  await assertContentAccess();

  const label = input.label.trim();
  const href = input.href.trim();
  if (label.length < 2) return { ok: false, message: "Give the link a label." };
  if (!href.startsWith("/")) {
    return { ok: false, message: "Pick a page from the list." };
  }

  const data = {
    group: input.group,
    label,
    href,
    highlight: input.highlight,
    isActive: input.isActive,
  };

  const item = input.id
    ? await db.navItem.update({ where: { id: input.id }, data })
    : await db.navItem.create({
        data: {
          ...data,
          position:
            ((
              await db.navItem.aggregate({
                where: { group: input.group },
                _max: { position: true },
              })
            )._max.position ?? 0) + 1,
        },
      });

  refreshContent();
  return { ok: true, id: item.id };
}

export async function deleteNavItem(id: string): Promise<SaveResult> {
  await assertContentAccess();
  await db.navItem.delete({ where: { id } });
  refreshContent();
  return { ok: true };
}

export async function reorderNavItems(ids: string[]): Promise<SaveResult> {
  await assertContentAccess();
  await db.$transaction(
    ids.map((id, position) => db.navItem.update({ where: { id }, data: { position } })),
  );
  refreshContent();
  return { ok: true };
}

/* --- policy pages --------------------------------------------------------- */

/**
 * Saving an editable page.
 *
 * Blocks are validated into shape rather than trusted, and empty paragraphs
 * and bullets are dropped — an editor that lets you add a row inevitably
 * collects blank ones, and a blank paragraph renders as a gap nobody can
 * explain.
 *
 * No sanitiser, because there is nothing to sanitise: the body is text and
 * lists, and React escapes every string on the way out. A client who types a
 * tag into the privacy policy publishes the characters.
 */
export async function savePage(input: {
  slug: string;
  title: string;
  lead: string;
  sections: { id: string; title: string; blocks: PageBlock[] }[];
  seoTitle?: string;
  seoDescription?: string;
  isActive: boolean;
}): Promise<SaveResult> {
  await assertContentAccess();

  const title = input.title.trim();
  if (title.length < 2) return { ok: false, message: "Give the page a title." };

  const sections = input.sections
    .map((s) => ({
      id: s.id || slugifySection(s.title),
      title: s.title.trim(),
      blocks: s.blocks
        .map((b) =>
          b.kind === "text"
            ? { kind: "text" as const, text: b.text.trim() }
            : {
                kind: "bullets" as const,
                items: b.items.map((i) => i.trim()).filter(Boolean),
              },
        )
        .filter((b) => (b.kind === "text" ? b.text.length > 0 : b.items.length > 0)),
    }))
    .filter((s) => s.title.length > 0);

  if (sections.length === 0) {
    return { ok: false, message: "A page needs at least one section with something in it." };
  }

  const page = await db.page.update({
    where: { slug: input.slug },
    data: {
      title,
      lead: input.lead.trim() || null,
      body: sections as unknown as object[],
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      isActive: input.isActive,
    },
  });

  refreshContent([`/${input.slug}`]);
  return { ok: true, id: page.id, slug: page.slug };
}

/* --- the announcement strip ---------------------------------------------- */



export async function saveAnnouncement(input: AnnouncementInput): Promise<SaveResult> {
  await assertContentAccess();

  const text = input.text.trim();
  if (text.length < 3) return { ok: false, message: "Write the message." };
  if (text.length > 90) {
    // The strip is one line beside up to two others. Anything longer either
    // wraps the bar to two rows or is cut off on a phone, and both look broken.
    return { ok: false, message: "Keep it under 90 characters — the strip is one line." };
  }

  const href = input.href.trim();
  if (href && !href.startsWith("/")) {
    return { ok: false, message: "Links must be a page on this shop, starting with /." };
  }

  /*
    Three, and the server is the one that says so.

    The panel already greys the button out at three and explains why, which is
    what an operator sees. This is the same rule where it cannot be walked
    past: a tab left open from before the third was added still has an enabled
    button, a double submit is two writes, and the next thing to call this will
    not be the form.

    It matters because the failure is not local. The strip is one line across
    the top of every page in the shop; a fourth message wraps it to two rows
    everywhere at once, and nothing in the panel would look wrong.

    Only on create — an edit to one of the existing three is not a fourth.
  */
  if (!input.id) {
    const existing = await db.announcement.count();
    if (existing >= MAX_ANNOUNCEMENTS) {
      return {
        ok: false,
        message: "Three is the most a one-line strip can hold. Remove one first.",
      };
    }
  }

  const data = {
    text,
    icon: input.icon,
    href: href || null,
    wideOnly: input.wideOnly,
    isActive: input.isActive,
  };

  const row = input.id
    ? await db.announcement.update({ where: { id: input.id }, data })
    : await db.announcement.create({
        data: { ...data, position: await db.announcement.count() },
      });

  refreshContent();
  return { ok: true, id: row.id };
}

export async function deleteAnnouncement(id: string): Promise<SaveResult> {
  await assertContentAccess();
  await db.announcement.delete({ where: { id } });
  refreshContent();
  return { ok: true };
}

export async function reorderAnnouncements(ids: string[]): Promise<SaveResult> {
  await assertContentAccess();
  await db.$transaction(
    ids.map((id, position) => db.announcement.update({ where: { id }, data: { position } })),
  );
  refreshContent();
  return { ok: true };
}
