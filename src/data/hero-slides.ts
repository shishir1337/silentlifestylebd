import type { StaticImageData } from "next/image";

import heroNewSeason from "@/assets/hero/hero-1-new-season.jpg";
import heroLadies from "@/assets/hero/hero-2-ladies.jpg";
import heroFormals from "@/assets/hero/hero-3-formals.jpg";
import heroNewSeasonMobile from "@/assets/hero/hero-1-new-season-mobile.jpg";
import heroLadiesMobile from "@/assets/hero/hero-2-ladies-mobile.jpg";
import heroFormalsMobile from "@/assets/hero/hero-3-formals-mobile.jpg";

/**
 * Hero banners.
 *
 * Any headline, price or call-to-action is part of the artwork itself — this
 * app renders no text over the image. Two consequences worth knowing before
 * you swap these out:
 *
 *  1. Two files per slide, and the sizes are not interchangeable:
 *       - desktop  **1920 x 600**  (3.2:1) — 450px tall on a 1440 screen
 *       - mobile   **1000 x 700**  (10:7) — 273px tall on a 390 screen
 *     A phone would have to letterbox a 3.2:1 banner into a thin strip, and a
 *     desktop showing the mobile crop would tower over the fold; each viewport
 *     gets artwork drawn for its own shape. Within a breakpoint every slide
 *     must match, or the track changes height as it scrolls. Nothing is ever
 *     cropped, so the wording in your artwork always survives.
 *  2. `alt` has to carry whatever the artwork says, word for word where it
 *     matters. It is the only version of that message available to a screen
 *     reader or to Google.
 */
export interface HeroSlide {
  id: string;
  /** Desktop / tablet banner, 1920 x 600. */
  image: StaticImageData;
  /** Phone banner, 1000 x 700. Swapped in below 768px. */
  imageMobile: StaticImageData;
  /** The banner's own wording. Not a description of the photo. */
  alt: string;
  /** Where tapping the banner goes. */
  href: string;
  /** Short label for the dot control, e.g. "New season". */
  label: string;
}

export const heroSlides: HeroSlide[] = [
  {
    id: "new-season",
    image: heroNewSeason,
    imageMobile: heroNewSeasonMobile,
    alt: "New season — everyday essentials, quietly well made. Shop new arrivals.",
    href: "/collections/new",
    label: "New season",
  },
  {
    id: "pakistani",
    image: heroLadies,
    imageMobile: heroLadiesMobile,
    alt: "Just landed — the Pakistani collection, stitched and unstitched three-piece sets. Shop the collection.",
    href: "/collections/pakistani-stitched",
    label: "Pakistani collection",
  },
  {
    id: "formals",
    image: heroFormals,
    imageMobile: heroFormalsMobile,
    alt: "Office ready — formal shirts, pants and shoes. Shop formals.",
    href: "/collections/men",
    label: "Formals",
  },
];
