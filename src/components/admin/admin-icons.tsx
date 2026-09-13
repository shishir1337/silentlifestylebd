/**
 * Admin icons.
 *
 * Drawn here rather than pulled from a library, matching the storefront's own
 * icon set: one stroke width (1.75), one 24-unit grid, `currentColor`
 * throughout so a single text colour drives the whole row. Emoji would have
 * been faster and would render differently on every phone the client owns.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function OrdersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16l-1.2 12.1a2 2 0 0 1-2 1.9H7.2a2 2 0 0 1-2-1.9L4 7Z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
    </svg>
  );
}

export function ProductsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 4 6.8v10.4L12 21l8-3.8V6.8L12 3Z" />
      <path d="M4 6.8 12 10.6l8-3.8" />
      <path d="M12 10.6V21" />
    </svg>
  );
}

export function CategoriesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

export function CollectionsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="15" width="7" height="5" rx="1.5" />
      <rect x="14" y="15" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function CustomersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 5.4" />
      <path d="M17.5 14.2A5.5 5.5 0 0 1 20.5 19" />
    </svg>
  );
}

export function MediaIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 16-4.5-4.5L7 20" />
    </svg>
  );
}

export function ShopIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 21V8.5L12 3l7 5.5V21" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </svg>
  );
}
