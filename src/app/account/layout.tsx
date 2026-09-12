import Link from "next/link";
import { Container } from "@/components/ui/container";
import { AccountNav } from "@/components/account/account-nav";
import { ChevronRightIcon } from "@/components/ui/icons";
import { AccountProvider } from "@/lib/account";

/**
 * Account shell.
 *
 * One layout for every dashboard screen, so the nav keeps its position and
 * scroll state as the customer moves between sections — Next reuses the layout
 * across navigations and only swaps the page below it.
 *
 * `AccountProvider` lives here rather than in each page for the same reason:
 * one copy of the profile and address book, shared by every screen, so saving
 * an address on one does not leave another showing the old list.
 *
 * Note what this layout deliberately does *not* do: gate anything. A layout
 * does not control whether its child segments render — they reach the RSC
 * payload regardless — so the auth check lives in each page instead.
 */
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <Container>
      <nav aria-label="Breadcrumb" className="pt-4">
        <ol className="flex flex-wrap items-center gap-1 text-[12px] text-ink-muted">
          <li className="flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] transition-colors duration-[var(--dur-base)] hover:text-ink"
            >
              Home
            </Link>
            <ChevronRightIcon aria-hidden className="size-3.5 text-line-strong" />
          </li>
          <li>
            <span aria-current="page" className="inline-flex min-h-6 items-center text-ink-soft">
              My account
            </span>
          </li>
        </ol>
      </nav>

      <AccountProvider>
        <div className="grid gap-6 py-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </AccountProvider>
    </Container>
  );
}
