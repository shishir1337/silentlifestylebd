import { getImageProps } from "next/image";
import Link from "next/link";
import { HeroCarousel } from "./hero-carousel";
import { heroSlides, type HeroSlide } from "@/data/hero-slides";

/** Phones and small tablets get the taller crop; everything else the wide one. */
const DESKTOP_MEDIA = "(min-width: 768px)";

/**
 * Hero: a plain banner carousel. No text, no buttons drawn over the artwork —
 * the wording is part of the image, so the whole banner is one tap target.
 *
 * Art direction via `getImageProps` + `<picture>` rather than two `<Image>`s
 * toggled with CSS: `<source media>` means the browser resolves exactly one
 * candidate and downloads exactly one file. Rendering both and hiding one
 * would pay for a banner nobody sees.
 *
 * Nothing is cropped — each `<img>` is `w-full h-auto` at its own intrinsic
 * ratio, because cover-cropping a banner would slice the artwork's own
 * headline off the edge. Width/height still ship on the element, so the box is
 * reserved before the image lands and CLS stays at zero.
 */
export function Hero() {
  return (
    <HeroCarousel slideLabels={heroSlides.map((s) => s.label)}>
      {heroSlides.map((slide, i) => (
        <div
          key={slide.id}
          data-slide={i}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${heroSlides.length}`}
          className="w-full shrink-0 snap-start"
        >
          <Link href={slide.href} className="block bg-muted">
            <Banner slide={slide} first={i === 0} />
          </Link>
        </div>
      ))}
    </HeroCarousel>
  );
}

function Banner({ slide, first }: { slide: HeroSlide; first: boolean }) {
  // Only the first banner competes for LCP; the rest wait until swiped to.
  const loading = first ? ("eager" as const) : ("lazy" as const);
  const common = {
    alt: slide.alt,
    sizes: "100vw",
    quality: 75,
    priority: first,
    loading,
  };

  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: slide.image });

  const {
    props: { srcSet: mobileSrcSet, ...rest },
  } = getImageProps({ ...common, src: slide.imageMobile });

  return (
    <picture>
      <source media={DESKTOP_MEDIA} srcSet={desktopSrcSet} />
      <source srcSet={mobileSrcSet} />
      {/*
        The aspect ratio has to be pinned in CSS, not left to the element's
        width/height attributes. Those attributes come from the *mobile* file
        (1000x700), so on desktop every not-yet-loaded lazy slide reserved a
        10:7 box — roughly 1008px at 1440 — while the loaded slide sat at 450px.
        The flex track takes the tallest child, so the carousel ballooned to
        over 1000px with a dead gap under the banner. These two ratios match
        the two files exactly, so the box is right before anything loads and
        nothing is cropped.
      */}
      <img {...rest} className="aspect-10/7 w-full object-cover md:aspect-16/5" />
    </picture>
  );
}
