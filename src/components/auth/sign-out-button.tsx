"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

/**
 * Sign out.
 *
 * A document navigation, mirroring sign-in: the cookie is being *cleared* here,
 * and a client-side navigation can go out before that lands — leaving the
 * customer looking at their own account page after asking to leave it. It also
 * drops the router cache, which is holding their name and addresses.
 */
export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await signOut();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-[13px] font-medium",
        "text-ink-muted transition-colors duration-[var(--dur-base)] hover:bg-subtle hover:text-ink",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
