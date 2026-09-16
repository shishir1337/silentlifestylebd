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

  /** "Next.js", announced on every response. Free reconnaissance, no benefit. */
  poweredByHeader: false,

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

  /**
   * The headers a browser needs in order to defend this shop.
   *
   * Set here rather than in nginx on purpose: they travel with the code, they
   * are reviewed with the code, and they survive the day somebody rebuilds the
   * proxy config from memory. The deployment guide's nginx block passes them
   * through untouched.
   *
   * Measured before writing: the site was serving none of these.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          /*
            Stop the browser guessing a content type.

            Every upload on this site goes to ImageKit rather than to this
            server, so the classic "image that is really a script" is already
            out of reach — but this costs a header and removes the whole class.
          */
          { key: "X-Content-Type-Options", value: "nosniff" },

          /*
            Clickjacking, said twice for the two generations of browser that
            listen for it. Both matter here rather than in the abstract: the
            admin panel has one-click destructive controls now — delete an
            order, delete a product — and an invisible frame over a page the
            owner is logged into is exactly how those get pressed by somebody
            else. `frame-ancestors` is also why this is a CSP header at all;
            see below for why it stops there.
          */
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },

          /*
            Full paths stay inside the origin, and nothing but the origin goes
            out. An order confirmation URL contains an order number, and that
            number is half of what the tracker accepts as proof.
          */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          /*
            The shop asks for none of these and never will, so no embedded
            third party gets to ask on its behalf.
          */
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },

          /*
            One year, and no `preload`.

            A browser that has seen this once will not be talked down to HTTP
            again, which is what protects the session cookie on a café network.
            `preload` is left off deliberately: it is a submission to a list
            baked into browsers and is slow and awkward to reverse, which is
            the wrong property for a shop that has not launched yet.

            Ignored over plain HTTP, so it is inert in development.
          */
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

/*
  What is deliberately NOT here: a `script-src` policy.

  A real one needs a nonce on every inline script, minted per request in the
  proxy. This site has three inline scripts that matter — the dataLayer
  bootstrap, Google Tag Manager and the Meta Pixel — and Tag Manager then
  injects more at runtime, which is the case a nonce policy handles worst.

  A CSP that is almost right is worse than none here. It would fail silently,
  in the browser, on the client's live site, and what it would break is the
  advertising measurement the shop is being launched to run. The honest state
  is: clickjacking is closed above, XSS is closed at the source — every value
  that reaches the page goes through React's escaping, and the four
  `dangerouslySetInnerHTML` calls are all `JSON.stringify` into JSON-LD, where
  React escapes `<` to `<` (verified by saving a product named
  `</script>` and loading the page).

  Revisit with nonces when there is time to test it against a live container.
*/

export default nextConfig;
