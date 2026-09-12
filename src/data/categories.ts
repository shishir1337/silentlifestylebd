import type { Category } from "@/types/catalog";

import panjabiModel from "@/assets/catalog/panjabi-off-white.jpg";
import catFormalShirt from "@/assets/catalog/cat-formal-shirt.jpg";
import catTshirt from "@/assets/catalog/cat-tshirt.jpg";
import poloRose from "@/assets/catalog/polo-rose.jpg";
import pantGabardine from "@/assets/catalog/pant-gabardine-beige.jpg";
import shoesOxford from "@/assets/catalog/shoes-oxford-brown.jpg";
import watchChrono from "@/assets/catalog/watch-chronograph.jpg";
import beltLeather from "@/assets/catalog/belt-leather-tan.jpg";
import walletBifold from "@/assets/catalog/wallet-bifold.jpg";
import purseStructured from "@/assets/catalog/purse-structured.jpg";
import braceletRoseGold from "@/assets/catalog/bracelet-rose-gold.jpg";
import pakistaniStitched from "@/assets/catalog/pakistani-stitched.jpg";

/**
 * Order matters: this is the mobile category rail, and it is the fastest
 * path from landing to a product page. Highest-intent categories lead.
 */
export const categories: Category[] = [
  {
    slug: "panjabi",
    name: "Panjabi",
    tagline: "Festive & everyday",
    image: panjabiModel,
    group: "men",
  },
  {
    slug: "formal-shirt",
    name: "Formal Shirt",
    tagline: "Office ready",
    image: catFormalShirt,
    group: "men",
  },
  {
    slug: "t-shirt",
    name: "T-Shirt",
    tagline: "Cotton, breathable",
    image: catTshirt,
    group: "men",
  },
  {
    slug: "polo",
    name: "Polo",
    tagline: "Pique knit",
    image: poloRose,
    group: "men",
  },
  {
    slug: "pants",
    name: "Pants",
    tagline: "Formal & gabardine",
    image: pantGabardine,
    group: "men",
  },
  {
    slug: "shoes",
    name: "Shoes",
    tagline: "Formal & casual",
    image: shoesOxford,
    group: "accessories",
  },
  {
    slug: "watches",
    name: "Watches",
    tagline: "Analog & chrono",
    image: watchChrono,
    group: "accessories",
  },
  {
    slug: "belts",
    name: "Belts",
    tagline: "Genuine leather",
    image: beltLeather,
    group: "accessories",
  },
  {
    slug: "wallets",
    name: "Wallets",
    tagline: "Money bags",
    image: walletBifold,
    group: "accessories",
  },
  {
    slug: "purses",
    name: "Purses",
    tagline: "Ladies handbags",
    image: purseStructured,
    group: "women",
  },
  {
    slug: "bracelets",
    name: "Bracelets",
    tagline: "Gold & steel tone",
    image: braceletRoseGold,
    group: "accessories",
  },
  {
    slug: "pakistani-stitched",
    name: "Pakistani Stitched",
    tagline: "Ready to wear",
    image: pakistaniStitched,
    group: "women",
  },
];

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
