"use client";

import { useCallback, useEffect, useState } from "react";
import type { DeliveryArea } from "@/lib/orders";
import { STORAGE_KEYS } from "@/lib/storage-keys";

/**
 * Customer profile and address book.
 *
 * There is no backend yet, so this persists to localStorage — but the shape is
 * the shape an API would return, and every read goes through a hook rather than
 * a direct storage call. Wiring this to a real endpoint means changing the two
 * `load`/`persist` helpers and nothing in the components.
 */

const PROFILE_KEY = STORAGE_KEYS.profile;
const ADDRESS_KEY = STORAGE_KEYS.addresses;

export interface Profile {
  name: string;
  phone: string;
  altPhone: string;
  email: string;
}

export interface Address {
  id: string;
  /** "Home", "Office" — what the customer calls it. */
  label: string;
  recipient: string;
  phone: string;
  address: string;
  area: DeliveryArea;
  isDefault: boolean;
}

export const emptyProfile: Profile = { name: "", phone: "", altPhone: "", email: "" };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or quota — the in-memory value still works for this session.
  }
}

export function newAddressId(): string {
  return `addr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* --- Hooks ---------------------------------------------------------------- */

/**
 * `ready` exists so screens can hold their layout until storage has been read.
 * Rendering an empty profile first and filling it in a frame later reads as a
 * bug, and on a form it can clobber what the customer just typed.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(load(PROFILE_KEY, emptyProfile));
    setReady(true);
  }, []);

  const save = useCallback((next: Profile) => {
    setProfile(next);
    persist(PROFILE_KEY, next);
  }, []);

  return { profile, ready, save };
}

export function useAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAddresses(load<Address[]>(ADDRESS_KEY, []));
    setReady(true);
  }, []);

  const commit = useCallback((next: Address[]) => {
    setAddresses(next);
    persist(ADDRESS_KEY, next);
  }, []);

  const upsert = useCallback(
    (entry: Address) => {
      setAddresses((prev) => {
        const exists = prev.some((a) => a.id === entry.id);
        let next = exists
          ? prev.map((a) => (a.id === entry.id ? entry : a))
          : [...prev, entry];

        // Exactly one default, always — including the first address added.
        if (entry.isDefault || next.length === 1) {
          next = next.map((a) => ({ ...a, isDefault: a.id === entry.id }));
        }
        persist(ADDRESS_KEY, next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setAddresses((prev) => {
      const next = prev.filter((a) => a.id !== id);
      // Removing the default promotes the next one rather than leaving none.
      if (next.length > 0 && !next.some((a) => a.isDefault)) next[0].isDefault = true;
      persist(ADDRESS_KEY, next);
      return next;
    });
  }, []);

  const makeDefault = useCallback((id: string) => {
    setAddresses((prev) => {
      const next = prev.map((a) => ({ ...a, isDefault: a.id === id }));
      persist(ADDRESS_KEY, next);
      return next;
    });
  }, []);

  return { addresses, ready, upsert, remove, makeDefault, commit };
}

/** The address checkout should prefill with, if any. */
export function defaultAddress(addresses: Address[]): Address | undefined {
  return addresses.find((a) => a.isDefault) ?? addresses[0];
}
