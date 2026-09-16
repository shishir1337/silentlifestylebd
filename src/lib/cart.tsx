"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/types/catalog";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { trackAddToCart } from "@/lib/tracking";

const STORAGE_KEY = STORAGE_KEYS.cart;

export interface CartLine {
  /** productId + size — two sizes of one shirt are two lines. */
  key: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  /**
   * Carried for the ad platforms, not for the shop.
   *
   * Meta and Google match an event to a catalogue entry by this string, and
   * the catalogue is exported with the same SKU the product page prints and
   * puts in its structured data. Optional because a bag saved before this
   * field existed has no SKU in it; those lines report the product id instead,
   * which is honest and stops being true of anything added from here on.
   */
  sku?: string;
  /** The category slug, for the same reason. Optional for the same reason. */
  categorySlug?: string;
  size?: string;
  /**
   * The colour they chose, carried all the way to the order.
   *
   * Not a stock dimension — colour has no variant row and never limits what
   * can be sold — but it is what has to go in the parcel. It used to be
   * picked on the product page and then dropped on the floor: the swatch set
   * state, the state was displayed, and `add` was never given it. A customer
   * could choose Navy, watch "Colour: Navy" appear above the button, and have
   * nothing about Navy reach the shop.
   */
  color?: string;
  qty: number;
}

interface CartApi {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** True once localStorage has been read; badges stay blank until then. */
  ready: boolean;
  add: (product: Product, size?: string, qty?: number, color?: string) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  /** The bag drawer is opened from both the header and the mobile tab bar,
      so its state lives here rather than being duplicated in each. */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartApi | null>(null);

const lineKey = (id: string, size?: string, color?: string) =>
  [id, size ?? "", color ?? ""].join("::").replace(/:+$/, "");

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Read after mount, never during render: the server has no localStorage, so
  // seeding state from it directly would hydrate a different tree than the one
  // that was sent and React would throw the whole subtree away.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        /*
          Sieved, not trusted. This has been on the customer's disk since who
          knows when, through who knows how many versions of this code, and
          one bad line poisons the whole bag: a line with `qty: 0` counted as
          an empty cart, so checkout showed "Your bag is empty" to somebody
          who could see their item in the drawer and had no way to remove it.

          Dropping the bad line is the only option that leaves them able to
          shop. Keeping it strands them; clearing everything throws away the
          items that were fine.
        */
        if (Array.isArray(parsed)) {
          setLines(
            (parsed as CartLine[]).filter(
              (l) =>
                l &&
                typeof l.key === "string" &&
                typeof l.productId === "string" &&
                Number.isFinite(l.qty) &&
                Number.isInteger(l.qty) &&
                l.qty > 0,
            ),
          );
        }
      }
    } catch {
      // Private mode, quota, or corrupt JSON — an empty cart is a fine fallback.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Ignore: persistence is a convenience, not a correctness requirement.
    }
  }, [lines, ready]);

  const add = useCallback((product: Product, size?: string, qty = 1, color?: string) => {
    /*
      Reported here rather than at each button.

      There are three ways into the bag — the buy box, the sticky bar on a
      phone, and the size sheet on a product card — and a fourth will be added
      the week after this comment is read. Adding the call to each of them is
      how a shop ends up with a conversion funnel that under-reports from
      whichever entry point someone forgot.

      Outside the state updater on purpose: React may run an updater more than
      once for a single call, and an analytics event is not something to send
      twice for one tap.
    */
    trackAddToCart({
      sku: product.sku,
      name: product.name,
      category: product.categorySlug,
      price: product.price,
      quantity: qty,
    });

    setLines((prev) => {
      const key = lineKey(product.id, size, color);
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.image.url,
          sku: product.sku,
          categorySlug: product.categorySlug,
          size,
          color,
          qty,
        },
      ];
    });
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<CartApi>(() => {
    let count = 0;
    let subtotal = 0;
    for (const l of lines) {
      count += l.qty;
      subtotal += l.qty * l.price;
    }
    return {
      lines, count, subtotal, ready,
      add, remove, setQty, clear,
      drawerOpen, openDrawer, closeDrawer,
    };
  }, [lines, ready, add, remove, setQty, clear, drawerOpen, openDrawer, closeDrawer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
