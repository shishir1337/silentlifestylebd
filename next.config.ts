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
     * Every image is resized and re-encoded by ImageKit at its edge, never by
     * this process. On a single VPS that matters twice over: the Node process
     * never decodes a JPEG, and a cold request never blocks on it. Measured on
     * the hero banner, 108 KB original JPEG -> 14 KB WebP at `w-828`.
     *
     * `loader: 'custom'` replaces the built-in optimiser outright, so
     * `formats` and `minimumCacheTTL` would be dead config here — format
     * negotiation is ImageKit's `f-auto` and caching is its CDN's. What still
     * applies is `deviceSizes`/`imageSizes`, which decide the widths in each
     * `srcSet` and so the widths the loader is asked for.
     */
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Next 16 defaults to [75]; 60 lets us serve lighter thumbnails on rails.
    qualities: [60, 75],
  },
};

export default nextConfig;
