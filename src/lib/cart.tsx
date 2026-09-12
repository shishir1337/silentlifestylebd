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

const STORAGE_KEY = "slbd.cart.v1";

export interface CartLine {
  /** productId + size — two sizes of one shirt are two lines. */
  key: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  qty: number;
}

interface CartApi {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** True once localStorage has been read; badges stay blank until then. */
  ready: boolean;
  add: (product: Product, size?: string, qty?: number) => void;
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

const lineKey = (id: string, size?: string) => (size ? `${id}::${size}` : id);

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
        if (Array.isArray(parsed)) setLines(parsed as CartLine[]);
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

  const add = useCallback((product: Product, size?: string, qty = 1) => {
    setLines((prev) => {
      const key = lineKey(product.id, size);
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
          size,
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
