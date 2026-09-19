"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertCatalogAccess } from "@/lib/admin/access";
import { CATALOG_TAG, CATEGORIES_TAG, CONTENT_TAG, PRODUCTS_TAG } from "@/lib/catalog";
import { toPlainText, toRichText } from "@/lib/rich-text";
import type { ProductInput, CategoryInput, SaveResult } from "@/lib/admin/catalog-types";

/**
 * Catalogue mutations.
 *
 * Three things every one of these does, in order:
 *
 *  1. **Authorise itself.** Not because the admin pages are unprotected — they
 *     are — but because a Server Action is a POST to whatever route it happens
 *     to be used from. Protection that comes from the page moves with the page,
 *     not with the action.
 *  2. **Validate.** The form checks too, as a courtesy; this is the check that
 *     decides what gets stored.
 *  3. **Revalidate.** Without this the client edits a price, sees the old one
 *     on the shop, and reasonably concludes the software is broken. Every
 *     mutation here says which cached reads it just invalidated.
 */

/* --- revalidation --------------------------------------------------------- */

/**
 * `"max"` everywhere: stale-while-revalidate.
 *
 * The next visitor is served the page that exists while a fresh one builds
 * behind them, rather than waiting for a render. For a catalogue that is the
 * right trade — a price that is a few seconds stale on one page view costs
 * nothing, and the checkout action re-prices from the database regardless, so
 * a stale page can never sell anything at the wrong price.
 */
function refreshCatalog() {
  revalidateTag(CATALOG_TAG, "max");
  revalidateTag(PRODUCTS_TAG, "max");
  revalidateTag(CATEGORIES_TAG, "max");
  // The homepage rails are assembled from products but live at a path with no
  // dynamic params, so the tag alone does not mark them stale.
  revalidatePath("/");
}

/* --- helpers -------------------------------------------------------------- */

/** "Premium Cotton Panjabi" -> "premium-cotton-panjabi". */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * Turns a Prisma unique-constraint error into something the client can act on.
 *
 * "Unique constraint failed on the fields: (`slug`)" is a sentence for a
 * developer. The person using this panel needs to know which box to change.
 */
function uniqueFieldMessage(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
  if (fields.some((f) => f.includes("slug"))) {
    return "Another product already uses that web address. Change the name, or edit the web address.";
  }
  if (fields.some((f) => f.includes("sku"))) {
    return "Another product already uses that product code.";
  }
  return "Something with those details already exists.";
}

function money(value: unknown): number | null {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* --- products ------------------------------------------------------------- */

export async function saveProduct(input: ProductInput): Promise<SaveResult> {
  await assertCatalogAccess();

  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase();
  const rich = toRichText(input.description);
  const description = toPlainText(rich);
  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(name)) || slugify(sku);

  if (name.length < 2) return { ok: false, message: "Give the product a name." };
  if (!sku) return { ok: false, message: "Give the product a code (SKU)." };
  if (!slug) return { ok: false, message: "That name cannot be turned into a web address. Add some letters." };
  if (!input.categoryId) return { ok: false, message: "Choose a category." };
  /*
    A product with no main picture is not a product the shop can render.
    `toProduct` throws on one by design — a card with an empty square is worse
    than no card — and because the catalogue is read as a whole, one such row
    takes down the homepage rather than one product page. The panel must not be
    able to save the state that does it.
  */
  if (!input.primaryAssetId) {
    return { ok: false, message: "Choose a main picture. The shop cannot show a product without one." };
  }

  /*
    The main and hover pictures must be pictures.

    A video in either slot is not a styling problem, it is four broken things:
    the product card in every grid renders it through `next/image`, the social
    card is drawn by Satori which cannot decode video at all, the structured
    data hands a crawler an `image` that is not one, and the hover swap has
    nothing to swap to. The gallery is where video belongs, and the form only
    ever offers it there — this is the check that holds if the form is ever
    wrong, or bypassed.
  */
  const stillIds = [input.primaryAssetId, input.hoverAssetId].filter(
    (id): id is string => Boolean(id),
  );
  if (stillIds.length > 0) {
    const videos = await db.asset.count({
      where: { id: { in: stillIds }, kind: "VIDEO" },
    });
    if (videos > 0) {
      return {
        ok: false,
        message:
          "The main and hover pictures have to be photographs. Video can go in the gallery below.",
      };
    }
  }

  const price = money(input.price);
  if (price === null || price === 0) {
    return { ok: false, message: "Enter a price in whole taka." };
  }

  const compareAtPrice = input.compareAtPrice ? money(input.compareAtPrice) : null;
  if (compareAtPrice !== null && compareAtPrice <= price) {
    // The storefront promises no inflated was-prices; this is where that
    // promise is actually enforceable.
    return {
      ok: false,
      message: "The old price must be higher than the price, or leave it empty.",
    };
  }

  const details = input.details.map((d) => d.trim()).filter(Boolean);
  const colors = input.colors.map((c) => c.trim()).filter(Boolean);

  /**
   * Sizes, de-duplicated and normalised.
   *
   * A product sold without sizes gets exactly one variant with an empty size,
   * so every stock lookup on the storefront goes through one path instead of
   * branching on whether sizes exist.
   */
  const seen = new Set<string>();
  const variants: { size: string; stock: number }[] = [];
  for (const v of input.variants) {
    const size = v.size.trim();
    if (seen.has(size)) continue;
    seen.add(size);
    const stock = Math.max(0, Math.round(Number(v.stock)) || 0);
    variants.push({ size, stock });
  }
  if (variants.length === 0) variants.push({ size: "", stock: 0 });

  try {
    const productId = await db.$transaction(async (tx) => {
      const data = {
        slug,
        name,
        sku,
        categoryId: input.categoryId,
        price,
        compareAtPrice,
        description,
        descriptionRich: rich as unknown as object[],
        badge: input.badge ?? null,
        freeDelivery: input.freeDelivery,
        isActive: input.isActive,
        seoTitle: input.seoTitle?.trim() || null,
        seoDescription: input.seoDescription?.trim() || null,
      };

      const product = input.id
        ? await tx.product.update({ where: { id: input.id }, data })
        : await tx.product.create({
            data: {
              ...data,
              // New products go to the end of the merchandised order.
              position: ((await tx.product.aggregate({ _max: { position: true } }))._max
                .position ?? 0) + 1,
            },
          });

      // Details and colours are rebuilt rather than diffed: they are short,
      // ordered lists where the order itself is the edit.
      await tx.productDetail.deleteMany({ where: { productId: product.id } });
      if (details.length > 0) {
        await tx.productDetail.createMany({
          data: details.map((text, position) => ({ productId: product.id, text, position })),
        });
      }

      await tx.productColor.deleteMany({ where: { productId: product.id } });
      if (colors.length > 0) {
        await tx.productColor.createMany({
          data: colors.map((cName, position) => ({
            productId: product.id,
            name: cName,
            position,
          })),
        });
      }

      /**
       * Variants are upserted, never rebuilt.
       *
       * They carry stock. Deleting and recreating them would silently zero the
       * inventory every time somebody fixed a typo in the description — and
       * `OrderItem.variantId` points at them, so it would also cut old orders
       * loose from what was sold.
       */
      for (const [position, v] of variants.entries()) {
        await tx.productVariant.upsert({
          where: { productId_size: { productId: product.id, size: v.size } },
          create: { productId: product.id, size: v.size, stock: v.stock, position },
          update: { stock: v.stock, position },
        });
      }
      // Sizes removed from the form are dropped, but only ones nobody ordered;
      // the relation is `onDelete: SetNull`, so an order would survive it, and
      // keeping the row is still the more honest record.
      await tx.productVariant.deleteMany({
        where: {
          productId: product.id,
          size: { notIn: variants.map((v) => v.size) },
          orderItems: { none: {} },
        },
      });

      await tx.productImage.deleteMany({ where: { productId: product.id } });
      /*
        Order matters and is the array's own: the main picture, the hover
        picture, then the rest as the client arranged them. The same asset is
        not stored twice — a gallery entry that repeats the main photograph
        would show the customer the same shot in two thumbnails.
      */
      const taken = new Set(
        [input.primaryAssetId, input.hoverAssetId].filter(Boolean) as string[],
      );
      const images = [
        input.primaryAssetId ? { assetId: input.primaryAssetId, role: "PRIMARY" as const } : null,
        input.hoverAssetId ? { assetId: input.hoverAssetId, role: "HOVER" as const } : null,
        /*
          De-duplicated as it goes: the same asset must not be the featured
          picture and a gallery entry as well. `filter` used to do the
          remembering inside its own predicate with a comma operator, which
          made a mutation look like a test — and a predicate that changes
          something is a predicate nobody can read twice the same way.
        */
        ...input.galleryAssetIds
          .filter((id) => {
            if (!id || taken.has(id)) return false;
            taken.add(id);
            return true;
          })
          .map((id) => ({ assetId: id, role: "GALLERY" as const })),
      ].filter(
        (i): i is { assetId: string; role: "PRIMARY" | "HOVER" | "GALLERY" } => i !== null,
      );
      if (images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((img, position) => ({
            productId: product.id,
            assetId: img.assetId,
            role: img.role,
            position,
          })),
        });
      }

      return product.id;
    });

    refreshCatalog();
    revalidatePath(`/products/${slug}`);
    return { ok: true, id: productId, slug };
  } catch (error) {
    const message = uniqueFieldMessage(error);
    if (message) return { ok: false, message };
    console.error("[admin] saveProduct failed:", error);
    return { ok: false, message: "Could not save the product. Please try again." };
  }
}

/** Publish or hide. Separated from `saveProduct` so it is one click in a list. */
export async function setProductActive(id: string, isActive: boolean): Promise<SaveResult> {
  await assertCatalogAccess();
  const product = await db.product.update({
    where: { id },
    data: { isActive },
    select: { slug: true },
  });
  refreshCatalog();
  revalidatePath(`/products/${product.slug}`);
  return { ok: true, id, slug: product.slug };
}

/**
 * Deleting a product, including one that has been sold.
 *
 * This used to refuse outright the moment a product appeared on any order, on
 * the grounds that deleting it would destroy the shop's history. It does not,
 * and the refusal was simply wrong: `OrderItem` snapshots the name, SKU,
 * price, size, colour and image as they were on the day of the sale, and its
 * link to the product is `onDelete: SetNull`. Every order keeps saying exactly
 * what was bought and what was charged for it.
 *
 * What is genuinely lost is the *link*: a deleted product's lines can no
 * longer be followed back to a live product page, and the top-sellers report
 * loses their category. That is a real cost, and it is the client's to weigh —
 * the form says how many orders are affected before it asks. Refusing on their
 * behalf left a shop unable to remove a product it had entered by mistake,
 * which is the case this is most often needed for.
 *
 * Hiding remains the better answer nearly every time, and the form still says
 * so. It is no longer the only answer.
 */
export async function deleteProduct(id: string): Promise<SaveResult> {
  await assertCatalogAccess();

  const product = await db.product.delete({ where: { id }, select: { slug: true } });
  refreshCatalog();
  revalidatePath(`/products/${product.slug}`);
  return { ok: true, id, slug: product.slug };
}

/** Drag-to-reorder on the product list. Positions arrive already in order. */
export async function reorderProducts(ids: string[]): Promise<SaveResult> {
  await assertCatalogAccess();
  await db.$transaction(
    ids.map((id, position) => db.product.update({ where: { id }, data: { position } })),
  );
  refreshCatalog();
  return { ok: true };
}

/* --- categories ----------------------------------------------------------- */

export async function saveCategory(input: CategoryInput): Promise<SaveResult> {
  await assertCatalogAccess();

  const name = input.name.trim();
  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(name));
  if (name.length < 2) return { ok: false, message: "Give the category a name." };
  if (!slug) return { ok: false, message: "That name cannot be turned into a web address." };

  const data = {
    slug,
    name,
    tagline: input.tagline?.trim() || null,
    imageId: input.imageId || null,
    /*
      An empty choice means "none", and none is a real answer: watches,
      wallets and bracelets come in one size, and a size guide on those pages
      would promise a table that does not exist.
    */
    sizeChartId: input.sizeChartId || null,
    isActive: input.isActive,
  };

  try {
    const category = input.id
      ? await db.category.update({ where: { id: input.id }, data })
      : await db.category.create({
          data: {
            ...data,
            position:
              ((await db.category.aggregate({ _max: { position: true } }))._max.position ?? 0) + 1,
          },
        });

    refreshCatalog();
    revalidatePath(`/collections/${slug}`);
    revalidatePath("/collections");
    return { ok: true, id: category.id, slug };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "Another category already uses that web address." };
    }
    console.error("[admin] saveCategory failed:", error);
    return { ok: false, message: "Could not save the category. Please try again." };
  }
}

/**
 * A category holding products cannot be deleted.
 *
 * The schema says so too — `Product.categoryId` is `onDelete: Restrict` — but a
 * foreign-key error is not a sentence anyone should be shown. This is the same
 * rule, said in advance and in English.
 */
export async function deleteCategory(id: string): Promise<SaveResult> {
  await assertCatalogAccess();

  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return {
      ok: false,
      message: `This category still has ${count} ${count === 1 ? "product" : "products"} in it. Move them to another category first, or hide this one instead.`,
    };
  }

  const category = await db.category.delete({ where: { id }, select: { slug: true } });
  refreshCatalog();
  revalidatePath("/collections");
  revalidatePath(`/collections/${category.slug}`);
  return { ok: true, id };
}

export async function reorderCategories(ids: string[]): Promise<SaveResult> {
  await assertCatalogAccess();
  await db.$transaction(
    ids.map((id, position) => db.category.update({ where: { id }, data: { position } })),
  );
  refreshCatalog();
  revalidatePath("/collections");
  return { ok: true };
}

/* --- media ---------------------------------------------------------------- */

/** Alt text is the only part of an image the shop can edit after upload. */
export async function updateAssetAlt(id: string, alt: string): Promise<SaveResult> {
  await assertCatalogAccess();
  await db.asset.update({ where: { id }, data: { alt: alt.trim() || null } });
  refreshCatalog();
  revalidateTag(CONTENT_TAG, "max");
  return { ok: true, id };
}

/**
 * Publish or hide a selection.
 *
 * One action rather than a loop of actions from the browser: Server Actions
 * are dispatched one at a time, so ten calls from a client is ten sequential
 * round trips. One `updateMany` is one statement.
 */
/**
 * Deleting a selection.
 *
 * One action rather than a loop of them from the browser: Server Actions are
 * dispatched one at a time, so forty from a list is forty round trips taken in
 * sequence while the operator watches a spinner.
 *
 * Reports how many had been sold, because that is the part worth knowing
 * afterwards. Those orders keep everything they recorded — name, price, size
 * and colour as sold — but they no longer link back to a product page, and the
 * top-sellers report loses those products' categories. The list says so before
 * it asks; this is the same sentence, after.
 */
export async function bulkDeleteProducts(
  ids: string[],
): Promise<SaveResult & { deleted?: number; sold?: number }> {
  await assertCatalogAccess();
  if (ids.length === 0) return { ok: false, message: "Nothing selected." };
  if (ids.length > 200) return { ok: false, message: "Select fewer than 200 at a time." };

  // Counted before the delete, because afterwards there is nothing to count.
  const sold = await db.orderItem
    .findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ["productId"] })
    .then((rows) => rows.length);

  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { slug: true },
  });

  const { count } = await db.product.deleteMany({ where: { id: { in: ids } } });

  refreshCatalog();
  for (const p of products) revalidatePath(`/products/${p.slug}`);
  return { ok: true, deleted: count, sold };
}

export async function bulkSetProductActive(
  ids: string[],
  isActive: boolean,
): Promise<SaveResult> {
  await assertCatalogAccess();
  if (ids.length === 0) return { ok: false, message: "Nothing selected." };
  if (ids.length > 200) return { ok: false, message: "Select fewer than 200 at a time." };

  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { slug: true },
  });
  await db.product.updateMany({ where: { id: { in: ids } }, data: { isActive } });

  refreshCatalog();
  for (const p of products) revalidatePath(`/products/${p.slug}`);
  return { ok: true };
}

/**
 * Correct stock from the list, without opening the editor.
 *
 * "New stock arrived" is a weekly job and the most common reason to touch a
 * product at all. Making it cost a page load, a form and a save is how a
 * two-minute task becomes one nobody does — and stale stock on a storefront
 * sells things the shop does not have.
 *
 * Only stock is writable here. Everything else about a variant has
 * consequences the list cannot show.
 */
export async function updateVariantStock(
  productId: string,
  levels: { id: string; stock: number }[],
): Promise<SaveResult> {
  await assertCatalogAccess();
  if (levels.length === 0) return { ok: false, message: "Nothing to change." };

  const clean = levels.map((l) => ({
    id: l.id,
    stock: Math.max(0, Math.round(Number(l.stock)) || 0),
  }));

  await db.$transaction(
    clean.map((l) =>
      // Scoped by product as well as id: a variant id from another product is
      // not something this call gets to write to.
      db.productVariant.updateMany({
        where: { id: l.id, productId },
        data: { stock: l.stock },
      }),
    ),
  );

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });

  refreshCatalog();
  if (product) revalidatePath(`/products/${product.slug}`);
  return { ok: true, id: productId };
}

/* --- collections ---------------------------------------------------------- */

/**
 * Editing a collection.
 *
 * Only what is genuinely content: the name, the description, which categories
 * belong to it, and whether it shows. The *rule* behind "New In" or "Offers"
 * is not editable, because it is not a setting — it is the predicate the
 * storefront uses (`badge = new`, `compareAtPrice > price`), and changing it
 * would mean changing code. The admin shows what the rule is so nobody has to
 * guess why a product appeared.
 *
 * The slug is not editable either. These six are linked from the navigation,
 * the footer and the homepage tiles; renaming one silently breaks all three.
 */
export async function saveCollection(input: {
  id: string;
  name: string;
  description: string;
  categoryIds: string[];
  isActive: boolean;
}): Promise<SaveResult> {
  await assertCatalogAccess();

  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2) return { ok: false, message: "Give the collection a name." };

  const existing = await db.collection.findUnique({
    where: { id: input.id },
    select: { slug: true, kind: true },
  });
  if (!existing) return { ok: false, message: "That collection no longer exists." };

  await db.$transaction(async (tx) => {
    await tx.collection.update({
      where: { id: input.id },
      data: { name, description, isActive: input.isActive },
    });

    // Membership only applies to CATEGORY collections; a RULE one derives its
    // products and has nothing to join.
    if (existing.kind === "CATEGORY") {
      await tx.categoryCollection.deleteMany({ where: { collectionId: input.id } });
      if (input.categoryIds.length > 0) {
        await tx.categoryCollection.createMany({
          data: input.categoryIds.map((categoryId, position) => ({
            collectionId: input.id,
            categoryId,
            position,
          })),
        });
      }
    }
  });

  refreshCatalog();
  revalidatePath("/collections");
  revalidatePath(`/collections/${existing.slug}`);
  return { ok: true, id: input.id, slug: existing.slug };
}

export async function reorderCollections(ids: string[]): Promise<SaveResult> {
  await assertCatalogAccess();
  await db.$transaction(
    ids.map((id, position) => db.collection.update({ where: { id }, data: { position } })),
  );
  refreshCatalog();
  revalidatePath("/collections");
  return { ok: true };
}
