import type { Product } from "@/types/catalog";

import beltLeather from "@/assets/catalog/belt-leather-tan.jpg";
import braceletGoldChain from "@/assets/catalog/bracelet-gold-chain.jpg";
import braceletRoseGold from "@/assets/catalog/bracelet-rose-gold.jpg";
import catPanjabi from "@/assets/catalog/cat-panjabi.jpg";
import catTshirt from "@/assets/catalog/cat-tshirt.jpg";
import ladiesMint from "@/assets/catalog/ladies-mint.jpg";
import pakistaniStitched from "@/assets/catalog/pakistani-stitched.jpg";
import pantCharcoal from "@/assets/catalog/pant-formal-charcoal.jpg";
import pantGabardine from "@/assets/catalog/pant-gabardine-beige.jpg";
import poloBlack from "@/assets/catalog/polo-black.jpg";
import poloRose from "@/assets/catalog/polo-rose.jpg";
import purseStructured from "@/assets/catalog/purse-structured.jpg";
import shirtChambray from "@/assets/catalog/shirt-chambray.jpg";
import shirtCheck from "@/assets/catalog/shirt-check.jpg";
import shirtFormalFolded from "@/assets/catalog/shirt-formal-folded.jpg";
import shirtFormalSky from "@/assets/catalog/shirt-formal-sky.jpg";
import shoesChukka from "@/assets/catalog/shoes-chukka-black.jpg";
import shoesOxford from "@/assets/catalog/shoes-oxford-brown.jpg";
import tshirtBlack from "@/assets/catalog/tshirt-black.jpg";
import tshirtWhite from "@/assets/catalog/tshirt-white.jpg";
import walletBifold from "@/assets/catalog/wallet-bifold.jpg";
import watchChrono from "@/assets/catalog/watch-chronograph.jpg";
import watchSteel from "@/assets/catalog/watch-steel.jpg";

/**
 * Placeholder catalogue. Prices are realistic Bangladeshi retail in whole BDT.
 * Replace with your PIM/CMS feed — nothing downstream reads anything beyond
 * the `Product` shape.
 */
export const products: Product[] = [
  {
    id: "p-101",
    slug: "premium-cotton-panjabi-off-white",
    name: "Premium Cotton Panjabi — Off White",
    categorySlug: "panjabi",
    sku: "SLB-PNJ-101",
    description:
      "A full-sleeve cotton panjabi cut for Dhaka heat — light enough for a workday, finished well enough for Eid. Subtle tonal embroidery at the placket.",
    details: [
      "100% combed cotton",
      "Regular fit, full sleeve",
      "Tonal thread work on placket",
      "Machine wash cold, do not bleach",
    ],
    price: 2290,
    compareAtPrice: 2990,
    image: catPanjabi,
    badge: "bestseller",
    inStock: true,
    colors: ["Off White", "Black", "Navy"],
    sizes: ["38", "40", "42", "44"],
  },
  {
    id: "p-102",
    slug: "slim-fit-formal-shirt-sky",
    name: "Slim Fit Formal Shirt — Sky Blue",
    categorySlug: "formal-shirt",
    sku: "SLB-SHT-102",
    description:
      "A slim-fit formal shirt in a breathable poplin weave. Holds a crease through a full working day without feeling stiff.",
    details: [
      "Cotton-rich poplin",
      "Slim fit through chest and waist",
      "Single-button barrel cuff",
      "Machine wash warm, iron medium",
    ],
    price: 1390,
    compareAtPrice: 1790,
    image: shirtFormalSky,
    hoverImage: shirtFormalFolded,
    badge: "bestseller",
    inStock: true,
    colors: ["Sky", "White", "Grey"],
    sizes: ["M", "L", "XL", "XXL"],
  },
  {
    id: "p-103",
    slug: "essential-cotton-tshirt-white",
    name: "Essential Cotton T-Shirt — White",
    categorySlug: "t-shirt",
    sku: "SLB-TSH-103",
    description:
      "The plain cotton tee, done properly. Mid-weight jersey that keeps its shape after repeated washes.",
    details: [
      "180 GSM cotton jersey",
      "Regular fit, ribbed crew neck",
      "Pre-shrunk",
      "Machine wash cold, tumble dry low",
    ],
    price: 690,
    compareAtPrice: 890,
    image: tshirtWhite,
    hoverImage: catTshirt,
    badge: "bestseller",
    inStock: true,
    colors: ["White", "Black", "Olive"],
    sizes: ["M", "L", "XL"],
  },
  {
    id: "p-104",
    slug: "pique-polo-dusty-rose",
    name: "Pique Knit Polo — Dusty Rose",
    categorySlug: "polo",
    sku: "SLB-POL-104",
    description:
      "A pique-knit polo with a soft collar that stays flat. Breathable enough for humid afternoons.",
    details: [
      "Cotton pique knit",
      "Two-button placket",
      "Ribbed collar and cuffs",
      "Machine wash cold",
    ],
    price: 990,
    image: poloRose,
    hoverImage: poloBlack,
    badge: "new",
    inStock: true,
    colors: ["Rose", "Navy", "Black"],
    sizes: ["M", "L", "XL"],
  },
  {
    id: "p-105",
    slug: "genuine-leather-belt-brown",
    name: "Genuine Leather Belt — Tan Brown",
    categorySlug: "belts",
    sku: "SLB-BLT-105",
    description:
      "Full-grain leather belt with a brushed metal buckle. Softens and darkens with wear rather than cracking.",
    details: [
      "Genuine full-grain leather",
      "35mm width",
      "Brushed nickel buckle",
      "Wipe clean with a dry cloth",
    ],
    price: 890,
    compareAtPrice: 1290,
    image: beltLeather,
    inStock: true,
    colors: ["Tan", "Black"],
    sizes: ["34", "36", "38", "40"],
  },
  {
    id: "p-106",
    slug: "bifold-leather-wallet",
    name: "Bifold Leather Wallet — Money Bag",
    categorySlug: "wallets",
    sku: "SLB-WLT-106",
    description:
      "A slim bifold that holds cards and notes without bulking out a back pocket.",
    details: [
      "Genuine leather",
      "Six card slots, two note compartments",
      "Slim profile",
      "Wipe clean with a dry cloth",
    ],
    price: 790,
    compareAtPrice: 1190,
    image: walletBifold,
    badge: "bestseller",
    inStock: true,
    colors: ["Brown", "Black"],
  },
  {
    id: "p-107",
    slug: "oxford-leather-formal-shoes",
    name: "Oxford Leather Formal Shoes",
    categorySlug: "shoes",
    sku: "SLB-SHO-107",
    description:
      "Leather oxfords on a cushioned sole. Formal enough for office, comfortable enough to wear all day.",
    details: [
      "Genuine leather upper",
      "Cushioned insole",
      "Rubber outsole with grip",
      "Use a shoe tree to keep shape",
    ],
    price: 2890,
    compareAtPrice: 3690,
    image: shoesOxford,
    hoverImage: shoesChukka,
    freeDelivery: true,
    inStock: true,
    colors: ["Brown", "Black"],
    sizes: ["39", "40", "41", "42", "43"],
  },
  {
    id: "p-108",
    slug: "chronograph-watch-leather-strap",
    name: "Chronograph Watch — Leather Strap",
    categorySlug: "watches",
    sku: "SLB-WCH-108",
    description:
      "A chronograph on a leather strap — a clean dial that reads at a glance, with a case slim enough to sit under a cuff.",
    details: [
      "Quartz chronograph movement",
      "Stainless steel case, 42mm",
      "Genuine leather strap",
      "30m water resistant — splash safe, not for swimming",
    ],
    price: 3490,
    compareAtPrice: 4990,
    image: watchChrono,
    hoverImage: watchSteel,
    badge: "limited",
    freeDelivery: true,
    inStock: true,
    colors: ["Brown", "Steel"],
  },
  {
    id: "p-109",
    slug: "pakistani-stitched-three-piece",
    name: "Pakistani Stitched Three Piece",
    categorySlug: "pakistani-stitched",
    sku: "SLB-PAK-109",
    description:
      "A ready-to-wear three piece — kameez, salwar and dupatta — in a soft lawn with detailed thread work across the yoke.",
    details: [
      "Premium lawn fabric",
      "Three piece: kameez, salwar, dupatta",
      "Thread work on yoke and sleeves",
      "Dry clean recommended",
    ],
    price: 3890,
    compareAtPrice: 4900,
    image: pakistaniStitched,
    hoverImage: ladiesMint,
    badge: "bestseller",
    freeDelivery: true,
    inStock: true,
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "p-110",
    slug: "structured-ladies-handbag",
    name: "Structured Ladies Handbag",
    categorySlug: "purses",
    sku: "SLB-PUR-110",
    description:
      "A structured top-handle bag that holds its shape when set down. Fits a phone, purse and everyday essentials.",
    details: [
      "Faux leather with structured panels",
      "Top handle with detachable sling",
      "Lined interior with zip pocket",
      "Wipe clean with a damp cloth",
    ],
    price: 2190,
    compareAtPrice: 2890,
    image: purseStructured,
    badge: "new",
    inStock: true,
    colors: ["Red", "Black", "Beige"],
  },
  {
    id: "p-111",
    slug: "gabardine-pant-beige",
    name: "Gabardine Pant — Beige",
    categorySlug: "pants",
    sku: "SLB-PNT-111",
    description:
      "Gabardine trousers with a clean, straight leg. Sturdy weave that resists wrinkling through the day.",
    details: [
      "Cotton gabardine twill",
      "Straight fit, mid rise",
      "Four pockets, button closure",
      "Machine wash cold, warm iron",
    ],
    price: 1290,
    compareAtPrice: 1690,
    image: pantGabardine,
    hoverImage: pantCharcoal,
    inStock: true,
    colors: ["Beige", "Olive", "Black"],
    sizes: ["30", "32", "34", "36"],
  },
  {
    id: "p-112",
    slug: "rose-gold-cuff-bracelet",
    name: "Rose Gold Cuff Bracelet",
    categorySlug: "bracelets",
    sku: "SLB-BRC-112",
    description:
      "A rose-gold tone cuff with a hinged opening, sized to sit close to the wrist.",
    details: [
      "Rose gold tone alloy",
      "Hinged cuff, adjustable",
      "Nickel free",
      "Keep away from perfume and water",
    ],
    price: 890,
    image: braceletRoseGold,
    hoverImage: braceletGoldChain,
    badge: "new",
    inStock: true,
  },
  {
    id: "p-113",
    slug: "chambray-casual-shirt",
    name: "Chambray Casual Shirt",
    categorySlug: "formal-shirt",
    sku: "SLB-SHT-113",
    description:
      "A chambray shirt that works open over a tee or buttoned with a collar. Softens with every wash.",
    details: [
      "100% cotton chambray",
      "Regular fit",
      "Curved hem, chest pocket",
      "Machine wash cold",
    ],
    price: 1190,
    image: shirtChambray,
    hoverImage: shirtCheck,
    inStock: true,
    colors: ["Chambray", "Check"],
    sizes: ["M", "L", "XL"],
  },
  {
    id: "p-114",
    slug: "formal-pant-charcoal",
    name: "Formal Pant — Charcoal",
    categorySlug: "pants",
    sku: "SLB-PNT-114",
    description:
      "Charcoal formal trousers with a flat front and a clean break over the shoe.",
    details: [
      "Poly-viscose blend suiting",
      "Flat front, straight leg",
      "Hook and bar closure",
      "Dry clean or gentle machine wash",
    ],
    price: 1590,
    compareAtPrice: 1990,
    image: pantCharcoal,
    badge: "bestseller",
    inStock: true,
    sizes: ["30", "32", "34", "36", "38"],
  },
  {
    id: "p-115",
    slug: "graphic-tee-black",
    name: "Oversized Graphic Tee — Black",
    categorySlug: "t-shirt",
    sku: "SLB-TSH-115",
    description:
      "An oversized tee with a dropped shoulder and a heavier body than a standard fit.",
    details: [
      "220 GSM cotton jersey",
      "Oversized fit, dropped shoulder",
      "Ribbed crew neck",
      "Machine wash cold, dry flat",
    ],
    price: 790,
    image: tshirtBlack,
    badge: "new",
    inStock: true,
    colors: ["Black", "Sand"],
    sizes: ["M", "L", "XL"],
  },
  {
    id: "p-116",
    slug: "suede-chukka-boot",
    name: "Suede Chukka Boot — Black",
    categorySlug: "shoes",
    sku: "SLB-SHO-116",
    description:
      "A suede chukka on a crepe sole — the boot that sits between trainers and formal shoes.",
    details: [
      "Suede leather upper",
      "Two-eyelet lace",
      "Crepe rubber sole",
      "Brush with a suede brush; keep dry",
    ],
    price: 3290,
    compareAtPrice: 4200,
    image: shoesChukka,
    badge: "limited",
    freeDelivery: true,
    inStock: false,
    sizes: ["40", "41", "42", "43"],
  },
];

export const newArrivals = products.filter((p) => p.badge === "new" || !p.badge).slice(0, 8);
export const bestSellers = products.filter((p) => p.badge === "bestseller").slice(0, 8);
export const onOffer = products
  .filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
  .slice(0, 8);
