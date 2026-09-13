import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedAssets, assetId, type AssetMap } from "./seed/assets.ts";

/**
 * Seeds the database from the storefront's original hardcoded data.
 *
 * `seed/data.json` was extracted mechanically from `src/data/*.ts` rather than
 * retyped, so prices, SKUs and copy cannot drift from what the site shipped
 * with. Re-running is safe: every write is an upsert keyed on the natural key
 * (slug, SKU, setting key), and children are replaced rather than duplicated.
 */

try {
  process.loadEnvFile();
} catch {
  // Docker and CI supply the environment directly.
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type Json = Record<string, any>;
const data: Json = JSON.parse(
  readFileSync(new URL("./seed/data.json", import.meta.url), "utf-8"),
);

/** "bestseller" -> "BESTSELLER"; null stays null. */
const badge = (v: string | null) =>
  v ? (v.toUpperCase() as "NEW" | "BESTSELLER" | "LIMITED") : null;

async function seedCategories(assets: AssetMap) {
  for (const [i, c] of data.categories.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        imageId: c.image ? assetId(assets, c.image) : null,
        position: i,
      },
      update: {
        name: c.name,
        tagline: c.tagline,
        imageId: c.image ? assetId(assets, c.image) : null,
        position: i,
      },
    });
  }
  console.log(`  categories: ${data.categories.length}`);
}

async function seedCollections() {
  // The three audience sets are CATEGORY collections; new/offers/bestsellers
  // are RULE collections derived from product attributes at read time.
  const rules: Record<string, "NEW" | "ON_OFFER" | "BESTSELLER"> = {
    new: "NEW",
    offers: "ON_OFFER",
    bestsellers: "BESTSELLER",
  };

  for (const [i, c] of data.collections.entries()) {
    const rule = rules[c.slug] ?? null;
    const collection = await db.collection.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        kind: rule ? "RULE" : "CATEGORY",
        rule,
        position: i,
      },
      update: { name: c.name, description: c.description, position: i },
    });

    const members: string[] = data.collectionMembers[c.slug] ?? [];
    if (members.length === 0) continue;

    // Replace membership wholesale — simpler than diffing, and the set is tiny.
    await db.categoryCollection.deleteMany({ where: { collectionId: collection.id } });
    for (const [j, slug] of members.entries()) {
      const category = await db.category.findUnique({ where: { slug } });
      if (!category) throw new Error(`Collection "${c.slug}" references unknown category "${slug}"`);
      await db.categoryCollection.create({
        data: { collectionId: collection.id, categoryId: category.id, position: j },
      });
    }
  }
  console.log(`  collections: ${data.collections.length}`);
}

async function seedProducts(assets: AssetMap) {
  for (const [i, p] of data.products.entries()) {
    const category = await db.category.findUnique({ where: { slug: p.categorySlug } });
    if (!category) throw new Error(`Product ${p.slug} references unknown category ${p.categorySlug}`);

    const product = await db.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        categoryId: category.id,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        description: p.description,
        badge: badge(p.badge),
        freeDelivery: p.freeDelivery,
        position: i,
      },
      update: {
        name: p.name,
        sku: p.sku,
        categoryId: category.id,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        description: p.description,
        badge: badge(p.badge),
        freeDelivery: p.freeDelivery,
        position: i,
      },
    });

    // Children are rebuilt rather than diffed. Variants are the exception —
    // they carry stock, which must survive a re-seed.
    await db.productDetail.deleteMany({ where: { productId: product.id } });
    await db.productColor.deleteMany({ where: { productId: product.id } });
    await db.productImage.deleteMany({ where: { productId: product.id } });

    await db.productDetail.createMany({
      data: p.details.map((text: string, position: number) => ({
        productId: product.id,
        text,
        position,
      })),
    });

    if (p.colors.length > 0) {
      await db.productColor.createMany({
        data: p.colors.map((name: string, position: number) => ({
          productId: product.id,
          name,
          position,
        })),
      });
    }

    const images = [
      { file: p.image, role: "PRIMARY" as const },
      ...(p.hoverImage ? [{ file: p.hoverImage, role: "HOVER" as const }] : []),
    ];
    await db.productImage.createMany({
      data: images.map((img, position) => ({
        productId: product.id,
        assetId: assetId(assets, img.file),
        role: img.role,
        position,
      })),
    });

    /**
     * Per-size stock — the capability the storefront did not have.
     *
     * Products sold without a size still get exactly one variant (size ""), so
     * every stock lookup goes through one path. Seeded stock is arbitrary: it
     * exists so the shop is usable on day one, and the client sets real numbers
     * in the admin. The single out-of-stock product keeps 0 so that state stays
     * visible on the storefront.
     */
    const sizes: string[] = p.sizes.length > 0 ? p.sizes : [""];
    for (const [position, size] of sizes.entries()) {
      await db.productVariant.upsert({
        where: { productId_size: { productId: product.id, size } },
        create: {
          productId: product.id,
          size,
          stock: p.inStock ? 12 : 0,
          position,
        },
        // Never overwrite stock on re-seed; it is live inventory.
        update: { position },
      });
    }
  }
  console.log(`  products: ${data.products.length} (with variants, details, colours, images)`);
}

async function seedContent(assets: AssetMap) {
  // --- hero slides
  for (const [i, s] of data.heroSlides.entries()) {
    const payload = {
      desktopAssetId: assetId(assets, s.image),
      mobileAssetId: assetId(assets, s.imageMobile),
      alt: s.alt,
      href: s.href,
      label: s.label,
      position: i,
    };
    const existing = await db.heroSlide.findFirst({ where: { label: s.label } });
    if (existing) await db.heroSlide.update({ where: { id: existing.id }, data: payload });
    else await db.heroSlide.create({ data: payload });
  }

  // --- promo tiles
  for (const [i, t] of data.promoTiles.entries()) {
    const payload = {
      title: t.title,
      subtitle: t.subtitle,
      href: t.href,
      cta: t.cta,
      assetId: assetId(assets, t.image),
      position: i,
    };
    const existing = await db.promoTile.findFirst({ where: { title: t.title } });
    if (existing) await db.promoTile.update({ where: { id: existing.id }, data: payload });
    else await db.promoTile.create({ data: payload });
  }

  // --- size charts
  for (const [i, c] of data.sizeCharts.entries()) {
    const chart = await db.sizeChart.upsert({
      where: { slug: c.id },
      create: { slug: c.id, title: c.title, note: c.note, columns: c.columns, position: i },
      update: { title: c.title, note: c.note, columns: c.columns, position: i },
    });
    await db.sizeChartRow.deleteMany({ where: { chartId: chart.id } });
    await db.sizeChartRow.createMany({
      data: c.rows.map((cells: string[], position: number) => ({
        chartId: chart.id,
        cells,
        position,
      })),
    });
  }

  // --- navigation
  await db.navItem.deleteMany({});
  for (const [group, items] of Object.entries(data.nav) as [string, Json[]][]) {
    await db.navItem.createMany({
      data: items.map((item, position) => ({
        group: group.toUpperCase() as "PRIMARY" | "HELP" | "COMPANY",
        label: item.label,
        href: item.href,
        highlight: Boolean(item.highlight),
        position,
      })),
    });
  }

  console.log(
    `  content: ${data.heroSlides.length} slides, ${data.promoTiles.length} tiles, ` +
      `${data.sizeCharts.length} size charts, ` +
      `${Object.values(data.nav).flat().length} nav items`,
  );
}

async function seedSettings() {
  const { site, delivery } = data;

  // `group` and `position` drive the admin settings form layout, so the order
  // here is the order the client will see.
  const settings: {
    key: string;
    value: string;
    type: "STRING" | "INT" | "TEXT";
    group: string;
    label: string;
    helpText?: string;
  }[] = [
    { key: "site.name", value: site.name, type: "STRING", group: "store", label: "Store name" },
    { key: "site.legalName", value: site.legalName, type: "STRING", group: "store", label: "Registered business name", helpText: "Used in search-engine structured data. Usually the same as the store name." },
    { key: "site.tagline", value: site.tagline, type: "STRING", group: "store", label: "Tagline" },
    { key: "site.description", value: site.description, type: "TEXT", group: "store", label: "Store description", helpText: "Used for search engines and social sharing." },
    { key: "site.phone", value: site.phone, type: "STRING", group: "contact", label: "Phone number", helpText: "International format, e.g. +8801711000000." },
    { key: "site.phoneDisplay", value: site.phoneDisplay, type: "STRING", group: "contact", label: "Phone (as displayed)" },
    { key: "site.email", value: site.email, type: "STRING", group: "contact", label: "Email address" },
    { key: "site.address", value: site.address, type: "TEXT", group: "contact", label: "Store address" },
    { key: "delivery.insideDhaka", value: String(delivery.insideDhaka), type: "INT", group: "delivery", label: "Delivery charge inside Dhaka (৳)" },
    { key: "delivery.outsideDhaka", value: String(delivery.outsideDhaka), type: "INT", group: "delivery", label: "Delivery charge outside Dhaka (৳)" },
    { key: "delivery.freeThreshold", value: String(delivery.freeThreshold), type: "INT", group: "delivery", label: "Free delivery above (৳)", helpText: "Compared against the goods subtotal, not the total." },
    { key: "delivery.insideDhakaDays", value: delivery.insideDhakaDays, type: "STRING", group: "delivery", label: "Delivery time inside Dhaka" },
    { key: "delivery.outsideDhakaDays", value: delivery.outsideDhakaDays, type: "STRING", group: "delivery", label: "Delivery time outside Dhaka" },
    { key: "delivery.returnWindowDays", value: String(delivery.returnWindowDays), type: "INT", group: "delivery", label: "Return window (days)" },
  ];

  for (const [position, s] of settings.entries()) {
    await db.setting.upsert({
      where: { key: s.key },
      create: { ...s, position },
      // Only metadata is refreshed — the client's edited values are preserved.
      update: { type: s.type, group: s.group, label: s.label, helpText: s.helpText, position },
    });
  }
  console.log(`  settings: ${settings.length}`);
}

async function seedPages() {
  const pages: {
    slug: string;
    title: string;
    lead: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    body: unknown[];
  }[] = JSON.parse(
    readFileSync(new URL("./seed/pages.json", import.meta.url), "utf-8"),
  );

  // The words themselves are never refreshed. These pages are the ones the
  // client is most likely to have rewritten, and a re-seed after a schema
  // change must not quietly restore the copy the shop launched with.
  let planted = 0;
  for (const p of pages) {
    const existing = await db.page.findUnique({
      where: { slug: p.slug },
      select: { id: true },
    });
    if (existing) continue;

    await db.page.create({
      data: {
        slug: p.slug,
        title: p.title,
        lead: p.lead,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        body: p.body as object[],
      },
    });
    planted += 1;
  }
  console.log(`  pages: ${planted} planted, ${pages.length - planted} already written`);
}

async function main() {
  console.log("Seeding Silent Lifestyle BD\n");

  console.log("assets → ImageKit");
  const assets = await seedAssets(db);
  console.log(`  ${assets.size} assets available\n`);

  console.log("catalog");
  await seedCategories(assets);
  await seedCollections();
  await seedProducts(assets);

  console.log("\ncontent");
  await seedContent(assets);
  await seedSettings();
  await seedPages();

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
