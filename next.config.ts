import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  /**
   * Emits a self-contained server at `.next/standalone` with only the traced
   * dependencies, which is what the Dockerfile ships. Note it does NOT copy
   * `public/` or `.next/static` — the Dockerfile places both by hand.
   */
  output: "standalone",
  images: {
    /**
     * Catalogue imagery is vendored into `src/assets/catalog` and statically
     * imported, so it is optimised at build time and served from our own
     * origin. Optimising remote URLs at request time cost ~1.8s on a cold
     * fetch and timed out repeatedly against the source CDN — unacceptable on
     * a storefront where the hero is the LCP element.
     *
     * When you move to a real CMS/DAM, add its host to `remotePatterns` here.
     */
    formats: ["image/avif", "image/webp"],
    // Next 16 defaults to [75]; 60 lets us serve lighter thumbnails on rails.
    qualities: [60, 75],
    minimumCacheTTL: 2678400, // 31 days
  },
};

export default nextConfig;
