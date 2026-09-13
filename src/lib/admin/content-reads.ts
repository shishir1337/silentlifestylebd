import "server-only";

import { db } from "@/lib/db";

/**
 * Editable site content, for the admin panel.
 *
 * Everything here was a constant in a source file until Phase 0 turned it into
 * rows. This is the half that makes that worth having: the rows are only an
 * improvement once somebody who cannot open a code editor can change them.
 */

export interface AdminHeroSlide {
  id: string;
  desktopAssetId: string;
  mobileAssetId: string;
  desktopUrl: string;
  mobileUrl: string;
  desktopSize: { width: number; height: number };
  mobileSize: { width: number; height: number };
  alt: string;
  href: string;
  label: string;
  position: number;
  isActive: boolean;
}

export async function listHeroSlides(): Promise<AdminHeroSlide[]> {
  const rows = await db.heroSlide.findMany({
    orderBy: { position: "asc" },
    include: { desktopAsset: true, mobileAsset: true },
  });

  return rows.map((s) => ({
    id: s.id,
    desktopAssetId: s.desktopAssetId,
    mobileAssetId: s.mobileAssetId,
    desktopUrl: s.desktopAsset.url,
    mobileUrl: s.mobileAsset.url,
    desktopSize: { width: s.desktopAsset.width, height: s.desktopAsset.height },
    mobileSize: { width: s.mobileAsset.width, height: s.mobileAsset.height },
    alt: s.alt,
    href: s.href,
    label: s.label,
    position: s.position,
    isActive: s.isActive,
  }));
}

export interface AdminPromoTile {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  assetId: string;
  imageUrl: string;
  position: number;
  isActive: boolean;
}

export async function listPromoTiles(): Promise<AdminPromoTile[]> {
  const rows = await db.promoTile.findMany({
    orderBy: { position: "asc" },
    include: { asset: true },
  });

  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    href: t.href,
    cta: t.cta,
    assetId: t.assetId,
    imageUrl: t.asset.url,
    position: t.position,
    isActive: t.isActive,
  }));
}

export interface AdminSizeChart {
  id: string;
  slug: string;
  title: string;
  note: string;
  columns: string[];
  rows: { id: string; cells: string[] }[];
  position: number;
  isActive: boolean;
}

export async function listSizeCharts(): Promise<AdminSizeChart[]> {
  const charts = await db.sizeChart.findMany({
    orderBy: { position: "asc" },
    include: { rows: { orderBy: { position: "asc" } } },
  });

  return charts.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    note: c.note,
    columns: c.columns,
    rows: c.rows.map((r) => ({ id: r.id, cells: r.cells })),
    position: c.position,
    isActive: c.isActive,
  }));
}

export interface AdminNavItem {
  id: string;
  group: "PRIMARY" | "HELP" | "COMPANY";
  label: string;
  href: string;
  highlight: boolean;
  position: number;
  isActive: boolean;
}

export async function listNavItems(): Promise<AdminNavItem[]> {
  const rows = await db.navItem.findMany({
    orderBy: [{ group: "asc" }, { position: "asc" }],
  });
  return rows.map((n) => ({
    id: n.id,
    group: n.group,
    label: n.label,
    href: n.href,
    highlight: n.highlight,
    position: n.position,
    isActive: n.isActive,
  }));
}

/**
 * Every address the navigation could legitimately point at.
 *
 * Offered as a list rather than a free text box because a typo in a menu link
 * is a 404 the client will not notice — they know where the page is, so they
 * do not click their own menu. The most common way a small shop's navigation
 * quietly breaks is a renamed collection nobody re-linked.
 */
export async function listLinkTargets(): Promise<{ href: string; label: string }[]> {
  const [categories, collections] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { slug: true, name: true },
    }),
    db.collection.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  return [
    { href: "/", label: "Home" },
    { href: "/collections", label: "All collections" },
    ...collections.map((c) => ({ href: `/collections/${c.slug}`, label: `Collection: ${c.name}` })),
    ...categories.map((c) => ({ href: `/collections/${c.slug}`, label: `Category: ${c.name}` })),
    { href: "/track", label: "Track your order" },
    { href: "/delivery", label: "Delivery & charges" },
    { href: "/returns", label: "Returns & exchange" },
    { href: "/size-guide", label: "Size guide" },
    { href: "/contact", label: "Contact us" },
    { href: "/about", label: "About us" },
    { href: "/stores", label: "Store locations" },
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms & conditions" },
    { href: "/account", label: "My account" },
  ];
}

export interface AdminPage {
  id: string;
  slug: string;
  title: string;
  lead: string | null;
  sections: import("@/lib/page-blocks").PageSection[];
  seoTitle: string | null;
  seoDescription: string | null;
  isActive: boolean;
  updatedAt: string;
}

/** The policy pages, in the order they appear in the footer. */
const PAGE_ORDER = ["privacy", "terms", "returns", "about"];

export async function listPages(): Promise<AdminPage[]> {
  const { toSections } = await import("@/lib/page-blocks");
  const rows = await db.page.findMany();

  return rows
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      lead: p.lead,
      sections: toSections(p.body),
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      isActive: p.isActive,
      updatedAt: p.updatedAt.toISOString(),
    }))
    .sort((a, b) => PAGE_ORDER.indexOf(a.slug) - PAGE_ORDER.indexOf(b.slug));
}

export async function getPage(slug: string): Promise<AdminPage | null> {
  const { toSections } = await import("@/lib/page-blocks");
  const p = await db.page.findUnique({ where: { slug } });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    lead: p.lead,
    sections: toSections(p.body),
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    isActive: p.isActive,
    updatedAt: p.updatedAt.toISOString(),
  };
}
