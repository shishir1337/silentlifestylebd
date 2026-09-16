import Script from "next/script";
import type { TrackingSettings } from "@/types/settings";

/**
 * The advertising tags, loaded from Settings.
 *
 * Mounted in the storefront layout, not the root one, on purpose. The admin
 * panel shares the root layout, and a shop's own staff opening forty product
 * pages a day would otherwise be measured as forty product views — poisoning
 * the audience the shop then pays Meta to advertise to.
 *
 * Nothing is loaded until an ID is filled in. Blank is the off switch, and a
 * shop that does not advertise ships no third-party script at all: no DNS
 * lookup to googletagmanager.com, no `fbevents.js`, nothing in the waterfall.
 *
 * A Server Component: it renders script tags and holds no state. That keeps
 * the pages static — the IDs come from `getSiteSettings()`, which the layout
 * has already read and which the prerender bakes in; changing one in the admin
 * panel invalidates the settings tag and the pages come back with the new tag.
 *
 * ## What is deliberately not here
 *
 * There is no route-change PageView. The Meta Pixel already fires PageView on
 * `history` state changes — that is what its `disablePushState` flag exists to
 * turn off — and the App Router navigates by pushState. Adding our own would
 * double-count every navigation on the site. The single `fbq('track',
 * 'PageView')` below is the first one only.
 */
export function SiteTracking({ tracking }: { tracking: TrackingSettings }) {
  const { gtmId, metaPixelId, metaEventsVia } = tracking;

  /*
    Both IDs are written into inline scripts, so both are sieved here as well
    as validated in the settings form. Two locks on the one door in this
    codebase where a stored string becomes executable code — and the settings
    form is not the only way a row can change: a migration, a psql session or
    a restored backup all reach the table without passing through it.
  */
  const gtm = /^GTM-[A-Z0-9]{4,}$/.test(gtmId) ? gtmId : "";
  const pixel = /^\d{15,16}$/.test(metaPixelId) ? metaPixelId : "";
  const pixelDirect = pixel && metaEventsVia === "direct";

  if (!gtm && !pixelDirect) {
    /*
      Still worth one line. `dataLayer` has to exist before anything pushes to
      it, and the event helpers run whether or not a container was ever
      configured — so the array is created, collects events, and is adopted
      intact on the day somebody pastes an ID in. That is the whole reason a
      tag manager reads from an array rather than a function.
    */
    return <Script id="datalayer-init">{"window.dataLayer=window.dataLayer||[];"}</Script>;
  }

  return (
    <>
      {/*
        One inline script, in one order, because the order is load-bearing:
        the array must exist before Tag Manager adopts it, and `slbdTracking`
        must be set before any event helper reads it. Splitting these into
        separate <Script> tags would leave that order up to the loader.

        `afterInteractive` is the documented strategy for tag managers and
        analytics: loaded as soon as possible, but never ahead of the code that
        renders the product the visitor came to see.
      */}
      <Script id="tracking-bootstrap" strategy="afterInteractive">
        {[
          "window.dataLayer=window.dataLayer||[];",
          `window.slbdTracking={meta:${JSON.stringify(pixelDirect ? "direct" : gtm ? "gtm" : "off")}};`,
          gtm &&
            "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});" +
              "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;" +
              "j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);" +
              `})(window,document,'script','dataLayer','${gtm}');`,
          pixelDirect &&
            "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?" +
              "n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;" +
              "n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;" +
              "t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}" +
              "(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');" +
              `fbq('init','${pixel}');fbq('track','PageView');`,
        ]
          .filter(Boolean)
          .join("\n")}
      </Script>

      {/*
        The no-script fallback Tag Manager asks for. It buys nothing for a
        visitor with JavaScript off — this shop cannot be used without it — but
        it is what GTM's own container check looks for, and a client whose
        agency reports "the container is not installed correctly" has a problem
        nobody in this repository can debug for them.
      */}
      {gtm ? (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
      ) : null}
    </>
  );
}
