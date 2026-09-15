import { ImageResponse } from "next/og";
import { freeDeliveryOffered } from "@/lib/orders";
import { getSiteSettings } from "@/lib/settings";

/**
 * The card a link to this shop shows when it is shared.
 *
 * In Bangladesh a shop link travels by WhatsApp and Messenger far more than by
 * search, and a link with no card is a grey rectangle with a domain in it.
 * This is the difference between a shared link that looks like a shop and one
 * that looks like spam.
 *
 * Drawn rather than photographed, and drawn from the settings — so the client
 * renaming the shop in the panel changes what gets shared, with no designer
 * and no redeploy.
 *
 * Two rules this layout obeys, both of them the renderer's rather than the
 * designer's:
 *
 *  1. Every element holding more than one child says `display: flex`. Satori
 *     has no block layout and throws rather than guessing — and an element
 *     with text either side of an interpolation has three children, which is
 *     the easy way to write this file and have it fail.
 *  2. The text is built into single strings first, for the same reason.
 *
 * Type is large because previews are shown small, in a chat list, on a phone:
 * anything under about 28px here is unreadable by the time it arrives.
 */
export const alt = "Silent Lifestyle BD — cash on delivery across Bangladesh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const taka = (n: number) => `Tk ${n.toLocaleString("en-US")}`;

export default async function Image() {
  const site = await getSiteSettings();
  const { delivery } = site;

  // The card is the shop's promise pasted into WhatsApp. Promising free
  // delivery over zero taka would be the shop offering it on everything.
  const promise = freeDeliveryOffered(delivery)
    ? `Cash on delivery nationwide · Free over ${taka(delivery.freeThreshold)}`
    : "Cash on delivery nationwide";
  const rates = `Dhaka ${taka(delivery.insideDhaka)} · Outside ${taka(delivery.outsideDhaka)}`;
  const returns = `${delivery.returnWindowDays}-day returns`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#faf9f7",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "#0b6e4f",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            SL
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#55524c" }}>
            {site.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 700,
              color: "#1a1917",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 920,
            }}
          >
            {site.tagline}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#55524c", maxWidth: 920 }}>
            {promise}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 28 }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "#e9f3ef",
              color: "#0b6e4f",
              padding: "10px 22px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            {returns}
          </div>
          <div style={{ display: "flex", color: "#6b6862" }}>{rates}</div>
        </div>
      </div>
    ),
    size,
  );
}
