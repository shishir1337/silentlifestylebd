"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { useOverlay } from "@/lib/use-overlay";
import { AdminSidebar } from "./admin-sidebar";
import { CloseIcon, MenuIcon } from "./admin-icons";
import { ToastProvider } from "./toast";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/cn";

/**
 * The admin frame: sidebar, top bar, and the scrolling work area.
 *
 * Two layouts, one component. From `lg` the sidebar is simply always there —
 * no toggle, no state, nothing to remember. Below `lg` it becomes a drawer
 * built on a native `<dialog>`, which brings the focus trap, the Escape key
 * and an inert background with it rather than reimplementing all three.
 *
 * The page itself does not scroll; the work area does. That keeps the sidebar
 * and the top bar fixed where the operator left them while a long product list
 * runs past — the behaviour every back office has and no shop page needs.
 */
export function AdminFrame({
  role,
  staffName,
  staffEmail,
  pendingOrders,
  children,
}: {
  role: StaffRole;
  staffName: string;
  staffEmail: string;
  pendingOrders: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { mounted, ref: attach, node } = useOverlay(open);
  const pathname = usePathname();

  // Keep React honest when the browser closes the dialog itself (Escape, or a
  // backdrop dismissal on some platforms).
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const onClose = () => setOpen(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [mounted, node]);

  // A drawer left open across a navigation covers the page just arrived at.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <ToastProvider>
    <div className="min-h-dvh bg-[var(--admin-bg)] lg:grid lg:h-dvh lg:grid-cols-[248px_minmax(0,1fr)] lg:overflow-hidden">
      {/* --------------------------------------------------- desktop rail */}
      <aside className="admin-chrome hidden lg:block lg:h-dvh lg:overflow-hidden">
        <AdminSidebar role={role} pendingOrders={pendingOrders} />
      </aside>

      {/* ------------------------------------------------------ work area */}
      <div className="flex min-w-0 flex-col lg:h-dvh lg:overflow-hidden">
        <header
          className={cn(
            "admin-chrome sticky top-0 z-[var(--z-header)] flex h-14 shrink-0 items-center gap-2 border-b border-line",
            "bg-canvas/95 px-3 backdrop-blur-sm supports-[backdrop-filter]:bg-canvas/80 sm:px-5 lg:static",
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="-ml-1 inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-ink transition-colors duration-[var(--dur-base)] hover:bg-muted active:bg-line lg:hidden"
          >
            <MenuIcon className="size-[22px]" />
          </button>

          <span className="text-[14px] font-semibold tracking-tight lg:hidden">
            Silent Lifestyle
          </span>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] leading-tight font-medium">{staffName}</p>
              <p className="text-[11px] leading-tight text-ink-muted">
                {ROLE_LABEL[role]}
              </p>
            </div>
            <span
              aria-hidden
              title={staffEmail}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white"
            >
              {initials(staffName)}
            </span>
            <SignOutButton />
          </div>
        </header>

        <main id="admin-main" data-admin-work className="min-w-0 flex-1 lg:overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ---------------------------------------------------- mobile drawer */}
      {mounted ? (
        <dialog
          ref={attach}
          onClick={(e) => {
            if (e.target === node.current) setOpen(false);
          }}
          aria-label="Admin menu"
          className={cn(
            "admin-drawer m-0 h-dvh max-h-none w-[270px] max-w-[85vw] border-0 bg-[var(--admin-nav)] p-0",
            "backdrop:bg-ink/50",
          )}
        >
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-2.5 right-2 z-10 inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-white/70 transition-colors duration-[var(--dur-base)] hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="size-5" />
            </button>
            <AdminSidebar
              role={role}
              pendingOrders={pendingOrders}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </dialog>
      ) : null}
    </div>
    </ToastProvider>
  );
}

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.at(-1)?.[0] ?? "")).toUpperCase().slice(0, 2);
}
