"use client";

import { createContext, useContext } from "react";
import type { SiteSettings } from "@/types/settings";

/**
 * Settings, for the parts of the shop that run in the browser.
 *
 * Six client components need the delivery charges or the phone number — the
 * cart drawer, the checkout form, the order tracker, the mobile menu and two
 * account screens. None of them can read a database, and threading a settings
 * object through six component trees by hand is six chances to forget one.
 *
 * The storefront layout reads the settings once on the server and hands the
 * plain object down. That keeps the pages static: the values are baked into
 * the prerender, and `revalidateTag("settings")` regenerates them.
 *
 * There is no default value on purpose. A component that renders outside the
 * provider would otherwise quote a delivery charge nobody set.
 */
const SettingsContext = createContext<SiteSettings | null>(null);

export function SettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SiteSettings {
  const settings = useContext(SettingsContext);
  if (!settings) {
    throw new Error("useSettings must be used inside <SettingsProvider>.");
  }
  return settings;
}

/** The delivery numbers alone, which is all most callers want. */
export function useDelivery() {
  return useSettings().delivery;
}
