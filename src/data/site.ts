export const site = {
  name: "Silent Lifestyle BD",
  legalName: "Silent Lifestyle BD",
  tagline: "Everyday essentials, quietly well made.",
  description:
    "Shop men's and women's fashion in Bangladesh — panjabi, formal shirts, pants, shoes, watches, belts, wallets and Pakistani ladies collections. Cash on delivery nationwide.",
  url: "https://silentlifestylebd.com",
  phone: "+8801711000000",
  phoneDisplay: "+880 1711-000000",
  email: "hello@silentlifestylebd.com",
  address: "Bashundhara City, Panthapath, Dhaka 1215",
} as const;

/** Delivery economics shown up-front — the single biggest COD trust lever. */
export const delivery = {
  insideDhaka: 60,
  outsideDhaka: 120,
  freeThreshold: 3000,
  insideDhakaDays: "1–2 days",
  outsideDhakaDays: "2–4 days",
  returnWindowDays: 7,
} as const;

export const nav = {
  primary: [
    { label: "Men", href: "/collections/men" },
    { label: "Women", href: "/collections/women" },
    { label: "Accessories", href: "/collections/accessories" },
    { label: "Shoes", href: "/collections/shoes" },
    { label: "New In", href: "/collections/new" },
    { label: "Offers", href: "/collections/offers", highlight: true },
  ],
  help: [
    { label: "Track your order", href: "/track" },
    { label: "Delivery & charges", href: "/delivery" },
    { label: "Returns & exchange", href: "/returns" },
    { label: "Size guide", href: "/size-guide" },
    { label: "Contact us", href: "/contact" },
  ],
  company: [
    { label: "About us", href: "/about" },
    { label: "Store locations", href: "/stores" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Terms & conditions", href: "/terms" },
  ],
} as const;
