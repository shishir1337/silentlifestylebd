import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CONTENT_TAG } from "@/lib/catalog";
import { toSections, type PageSection } from "@/lib/page-blocks";

/**
 * The editable pages, for the storefront.
 *
 * Cached and tagged like everything else the shop renders, so these stay
 * prerendered static HTML. Saving in the admin invalidates `CONTENT_TAG` and
 * the page's own path, which is what makes an edit appear without a deploy.
 */

export interface StorePage {
  slug: string;
  title: string;
  lead: string | null;
  sections: PageSection[];
  seoTitle: string | null;
  seoDescription: string | null;
  /** Real, from the row — a policy that claims a date it does not have is worse
      than none, and this one cannot go stale. */
  updatedAt: string;
}

export const getStorePage = unstable_cache(
  async (slug: string): Promise<StorePage | null> => {
    const p = await db.page.findFirst({ where: { slug, isActive: true } });
    if (!p) return null;
    return {
      slug: p.slug,
      title: p.title,
      lead: p.lead,
      sections: toSections(p.body),
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      updatedAt: p.updatedAt.toISOString(),
    };
  },
  ["content:page"],
  { revalidate: 31_536_000, tags: [CONTENT_TAG] },
);
