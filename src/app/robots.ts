import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

/**
 * What a crawler is welcome to read.
 *
 * The shop is the point, so everything under it is open. What is closed is
 * everything that is either somebody's private business or a page a crawler
 * would only waste its budget on:
 *
 *   /admin      the panel. Every page in it checks the session anyway — this
 *               is politeness, not a lock.
 *   /account    one customer's orders and addresses.
 *   /order/*    a specific order, reachable by anyone holding the number.
 *   /checkout   a form with nothing in it until a cart exists.
 *   /search     infinite: one URL per query anyone has ever typed. The
 *               products behind it are all in the sitemap by their own
 *               addresses, so nothing is lost by keeping crawlers out of it.
 *
 * `/api/` is closed for the same reason as `/search`: it answers to the
 * application, not to a reader.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/order/", "/checkout", "/search", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
