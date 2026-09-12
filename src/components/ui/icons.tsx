import type { SVGProps } from "react";

/**
 * Hand-rolled icon set (Lucide geometry, 24px grid, 1.75 stroke).
 *
 * An icon library would add a dependency and a barrel import to every route
 * for the ~20 glyphs this storefront actually uses. These are inlined into the
 * RSC payload instead, so they cost nothing at runtime and never flash.
 *
 * Decorative by default (`aria-hidden`); pass a `title` when an icon is the
 * only label for a control.
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Icon({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Icon>
);

export const BagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 8h12l-1 12H7L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Icon>
);

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Icon>
);

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z" />
  </Icon>
);

export const GridIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Icon>
);

export const TruckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7.5h10.5v8H3v-8Z" />
    <path d="M13.5 10.5H17l3 3v2h-6.5v-5Z" />
    <circle cx="7" cy="17.5" r="1.75" />
    <circle cx="16.5" cy="17.5" r="1.75" />
  </Icon>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.6-7 8.9-4.1-1.3-7-4.7-7-8.9V6l7-2.5Z" />
    <path d="m9.2 12 2 2 3.6-3.6" />
  </Icon>
);

export const ReturnIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10a8 8 0 1 1 1.2 5" />
    <path d="M4 5v5h5" />
  </Icon>
);

export const CashIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
    <circle cx="12" cy="12" r="2.75" />
    <path d="M6 10v4M18 10v4" />
  </Icon>
);

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
  </Icon>
);

export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const SparkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
  </Icon>
);

export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 5v14M14.5 5v14" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 4.8v14.4L19 12 7.5 4.8Z" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M6.5 7 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
  </Icon>
);

/* --- Brand marks: filled paths, no stroke. --------------------------------- */

export const FacebookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false" {...p}>
    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V13h2.7v8h3.2Z" />
  </svg>
);

export const InstagramIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden focusable="false" {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="3.75" />
    <circle cx="16.9" cy="7.1" r="1.05" fill="currentColor" stroke="none" />
  </svg>
);

export const WhatsAppIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false" {...p}>
    <path d="M12 2.75a9.2 9.2 0 0 0-7.9 13.9L3 21.25l4.75-1.05A9.25 9.25 0 1 0 12 2.75Zm0 1.9a7.35 7.35 0 1 1-3.85 13.6l-.3-.2-2.5.55.55-2.45-.2-.3A7.35 7.35 0 0 1 12 4.65Zm-3.1 3.6c-.15 0-.4.05-.6.3s-.8.75-.8 1.85.8 2.15.95 2.3c.15.2 1.6 2.5 3.95 3.4 1.95.75 2.35.6 2.8.55.4-.05 1.3-.5 1.5-1.05.2-.55.2-1 .15-1.1-.05-.1-.2-.15-.4-.25l-1.5-.75c-.2-.1-.35-.15-.5.1l-.7.85c-.1.15-.25.15-.45.05-.2-.1-.9-.35-1.7-1.05a6.4 6.4 0 0 1-1.15-1.5c-.15-.2 0-.3.1-.4l.35-.4c.1-.15.15-.25.2-.4.05-.15 0-.3-.05-.4l-.7-1.65c-.15-.4-.35-.35-.5-.35h-.05Z" />
  </svg>
);
