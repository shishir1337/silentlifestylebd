import type { NextConfig } from "next";

/**
 * Refuse to build a release that will break on its second deploy.
 *
 * `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is read at **build** time and baked in.
 * Left empty, the build happily invents a random one — and every Server Action
 * id is derived from it, so the moment a second container starts or a new
 * image is rolled out, anyone mid-session gets "Failed to find Server Action"
 * on their next click. Checkout is a Server Action.
 *
 * It is the worst class of missing config: nothing is wrong at build, nothing
 * is wrong on the first deploy, and it breaks paying customers on the second.
 * So the build stops here instead, where it costs a minute.
 *
 * Only in production builds — `next dev` regenerates freely and nobody is
 * mid-purchase on a developer's machine.
 */
if (process.env.NODE_ENV === "production" && !process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
  throw new Error(
    "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY is empty.\n\n" +
      "It is baked into the build and must be identical across every container\n" +
      "and stable across deploys, or customers hit “Failed to find Server\n" +
      "Action” after a release — including at checkout.\n\n" +
      "  openssl rand -base64 32\n\n" +
      "Put it in .env (and in your deploy secrets) and build again.",
  );
}

const nextConfig: NextConfig = {
  reactCompiler: true,

  /**
   * Which origins may POST a Server Action.
   *
   * Next compares the request's `Origin` with the host it believes it is
   * served from. Behind a reverse proxy that host is `localhost:3000` as far
   * as the process can tell, while the browser sends the public origin — so
   * without this, every action is refused as cross-origin and the shop breaks
   * in a way that never reproduces on a developer's machine.
   *
   * Derived from the public URL, so there is one place to change it.
   */
  /*
    No `experimental.serverActions.allowedOrigins` here, deliberately.

    Next compares the browser's `Origin` against the host it believes it is
    serving — and behind a proxy it takes that from `x-forwarded-host` when the
    proxy sends one. So the fix for "every Server Action is rejected as
    cross-origin behind nginx" is one line in the proxy, not a list in here
    that has to be kept in step with the domain:

        proxy_set_header X-Forwarded-Host $host;

    See `docker-compose.yml` for the full proxy block. Tried the config route
    first; on 16.3.5 it also breaks `next dev` outright, every route 500ing
    with a JSON parse error, which is a second reason not to take it.
  */

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
