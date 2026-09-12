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
import {
  deleteAddress,
  loadAccount,
  makeAddressDefault,
  saveAddress,
  saveProfile,
} from "@/lib/account-actions";
import { emptyProfile, type Address, type Profile } from "@/lib/account-types";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export { emptyProfile };
export type { Address, Profile };

/**
 * The customer's profile and address book, from whichever store owns them.
 *
 * Two storage backends behind one API:
 *
 *  - **Signed in** — Postgres, through Server Actions. Addresses follow the
 *    customer to their next device, which is the entire reason to offer an
 *    account in a shop where checkout never required one.
 *  - **Guest** — `localStorage`, exactly as before. Guest checkout is the
 *    default path through this store and must keep working with no account,
 *    no cookie and no server state.
 *
 * Callers never choose. `useProfile()` and `useAddresses()` read the same
 * shapes either way, so the checkout form has no idea which one it is using.
 *
 * ## Why a context and not two hooks
 *
 * They were two independent hooks, each holding its own `useState` seeded from
 * its own read. The overview and the checkout form therefore held separate
 * copies: saving an address on one screen left the other showing the old list
 * until a reload. One provider, one copy.
 */

interface AccountApi {
  /** False until the first load resolves — screens hold their layout on it. */
  ready: boolean;
  signedIn: boolean;
  profile: Profile;
  addresses: Address[];
  saveProfile: (next: Profile) => Promise<void>;
  upsertAddress: (entry: Address) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
}

const AccountContext = createContext<AccountApi | null>(null);

/* --- guest storage -------------------------------------------------------- */

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or quota — the in-memory value still serves this session.
  }
}

/** Guests need an id for React keys and for edit-in-place; the server mints
    its own, so this is never sent anywhere. */
function localAddressId(): string {
  return `addr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * "Exactly one default, always" — the guest-side implementation of the rule
 * the database enforces with a partial unique index and a transaction. Both
 * have to agree, or signing in would silently change which address checkout
 * prefills.
 */
function withOneDefault(list: Address[], preferred?: string): Address[] {
  if (list.length === 0) return list;
  const chosen = list.find((a) => a.id === preferred) ?? list.find((a) => a.isDefault) ?? list[0];
  return list.map((a) => ({ ...a, isDefault: a.id === chosen.id }));
}

/* --- provider ------------------------------------------------------------- */

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [addresses, setAddresses] = useState<Address[]>([]);

  useEffect(() => {
    let cancelled = false;

    loadAccount()
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot.signedIn && snapshot.profile) {
          setSignedIn(true);
          setProfile(snapshot.profile);
          setAddresses(snapshot.addresses);
        } else {
          setProfile(readLocal(STORAGE_KEYS.profile, emptyProfile));
          setAddresses(readLocal<Address[]>(STORAGE_KEYS.addresses, []));
        }
      })
      .catch(() => {
        // The server is unreachable. Fall back to whatever this device knows
        // rather than showing an empty account — a shopper mid-checkout would
        // otherwise have to retype an address they already saved.
        if (cancelled) return;
        setProfile(readLocal(STORAGE_KEYS.profile, emptyProfile));
        setAddresses(readLocal<Address[]>(STORAGE_KEYS.addresses, []));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persistProfile = useCallback(
    async (next: Profile) => {
      if (signedIn) {
        setProfile(await saveProfile(next));
        return;
      }
      setProfile(next);
      writeLocal(STORAGE_KEYS.profile, next);
    },
    [signedIn],
  );

  const upsertAddress = useCallback(
    async (entry: Address) => {
      if (signedIn) {
        setAddresses(await saveAddress(entry));
        return;
      }
      setAddresses((prev) => {
        const id = entry.id || localAddressId();
        const saved = { ...entry, id };
        const exists = prev.some((a) => a.id === id);
        const merged = exists ? prev.map((a) => (a.id === id ? saved : a)) : [...prev, saved];
        const next = withOneDefault(merged, entry.isDefault || prev.length === 0 ? id : undefined);
        writeLocal(STORAGE_KEYS.addresses, next);
        return next;
      });
    },
    [signedIn],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      if (signedIn) {
        setAddresses(await deleteAddress(id));
        return;
      }
      setAddresses((prev) => {
        const next = withOneDefault(prev.filter((a) => a.id !== id));
        writeLocal(STORAGE_KEYS.addresses, next);
        return next;
      });
    },
    [signedIn],
  );

  const setDefaultAddress = useCallback(
    async (id: string) => {
      if (signedIn) {
        setAddresses(await makeAddressDefault(id));
        return;
      }
      setAddresses((prev) => {
        const next = withOneDefault(prev, id);
        writeLocal(STORAGE_KEYS.addresses, next);
        return next;
      });
    },
    [signedIn],
  );

  const value = useMemo<AccountApi>(
    () => ({
      ready,
      signedIn,
      profile,
      addresses,
      saveProfile: persistProfile,
      upsertAddress,
      removeAddress,
      setDefaultAddress,
    }),
    [
      ready,
      signedIn,
      profile,
      addresses,
      persistProfile,
      upsertAddress,
      removeAddress,
      setDefaultAddress,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

function useAccount(): AccountApi {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used inside <AccountProvider>.");
  }
  return ctx;
}

export function useProfile() {
  const { profile, ready, signedIn, saveProfile } = useAccount();
  return { profile, ready, signedIn, save: saveProfile };
}

export function useAddresses() {
  const { addresses, ready, signedIn, upsertAddress, removeAddress, setDefaultAddress } =
    useAccount();
  return {
    addresses,
    ready,
    signedIn,
    upsert: upsertAddress,
    remove: removeAddress,
    makeDefault: setDefaultAddress,
  };
}

/** The address checkout should prefill with, if any. */
export function defaultAddress(addresses: Address[]): Address | undefined {
  return addresses.find((a) => a.isDefault) ?? addresses[0];
}
