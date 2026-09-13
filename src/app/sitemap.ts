import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";
import { getSitemapEntries } from "@/lib/catalog";
import { getLivePageEntries } from "@/lib/pages";

/**
 * The map a crawler works from.
 *
 * Built from the database rather than a list in this file, which is the whole
 * point: the client adds a product in the panel and it is in the sitemap on
 * the next crawl, with no developer in between. It is a cached route like
 * every other read here, tagged with the catalogue and content tags — so
 * publishing a product invalidates the sitemap along with the pages.
 *
 * `lastModified` is each row's own `updatedAt`. A sitemap that stamps today
 * on every entry teaches a crawler to ignore the field, and after that a real
 * price change waits as long to be noticed as a typo fix.
 *
 * Priorities are relative, and only three values are used. Finer gradations
 * are a fiction: search engines treat this as a weak hint, and pretending to
 * know that a product is 0.64 rather than 0.7 is noise.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalogue, pages] = await Promise.all([
    getSitemapEntries(),
    getLivePageEntries(),
  ]);

  const url = (path: string) => `${siteUrl}${path === "/" ? "" : path}`;

  /**
   * The pages that exist in code rather than in a row.
   *
   * Delivery, contact, stores and the size guide are built from settings and
   * from the size-chart rows, so they have no single `updatedAt` to report.
   * They change rarely; a weekly hint is honest about that.
   */
  const fixed: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/collections"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/delivery"), changeFrequency: "weekly", priority: 0.6 },
    { url: url("/size-guide"), changeFrequency: "weekly", priority: 0.6 },
    { url: url("/contact"), changeFrequency: "weekly", priority: 0.6 },
    { url: url("/stores"), changeFrequency: "weekly", priority: 0.6 },
    { url: url("/track"), changeFrequency: "monthly", priority: 0.4 },
  ];

  return [
    ...fixed,
    ...catalogue.map((e) => ({
      url: url(e.path),
      lastModified: e.lastModified,
      changeFrequency: "daily" as const,
      // A product page is what the shop is for; a collection is a way to it.
      priority: e.path.startsWith("/products/") ? 0.8 : 0.7,
    })),
    ...pages.map((e) => ({
      url: url(e.path),
      lastModified: e.lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
