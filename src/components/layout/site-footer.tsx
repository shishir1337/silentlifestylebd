import Link from "next/link";
import { Container } from "@/components/ui/container";
import {
  CashIcon,
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { getNav } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";
import { Logo } from "./logo";
import { Taka } from "@/components/ui/price";

export async function SiteFooter() {
  const [site, nav] = await Promise.all([getSiteSettings(), getNav()]);
  const { delivery } = site;

  // wa.me wants the number without a leading plus, and it should be the same
  // number the client edits in Settings — not a second one to keep in step.
  const socials = [
    { href: "https://facebook.com", label: "Facebook", Icon: FacebookIcon },
    { href: "https://instagram.com", label: "Instagram", Icon: InstagramIcon },
    {
      href: `https://wa.me/${site.phone.replace(/\D/g, "")}`,
      label: "WhatsApp",
      Icon: WhatsAppIcon,
    },
  ];

  return (
    <footer className="mt-16 border-t border-line bg-subtle sm:mt-24">
      <Container>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-4 lg:py-16">
          {/* Brand + contact */}
          <div className="col-span-2 lg:col-span-1 lg:pr-6">
            <Logo size="lg" />

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
              {site.tagline} Men&apos;s and women&apos;s fashion delivered
              across Bangladesh.
            </p>

            <ul className="mt-4 space-y-1 text-sm">
              <li>
                <a
                  href={`tel:${site.phone}`}
                  className="inline-flex min-h-[32px] items-center gap-2 text-ink-soft transition-colors duration-[var(--dur-base)] hover:text-brand"
                >
                  <PhoneIcon className="size-4 shrink-0 text-ink-muted" />
                  <span className="tabular">{site.phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex min-h-[32px] items-center gap-2 text-ink-soft transition-colors duration-[var(--dur-base)] hover:text-brand"
                >
                  <MailIcon className="size-4 shrink-0 text-ink-muted" />
                  {site.email}
                </a>
              </li>
              <li className="flex items-start gap-2 text-ink-soft">
                <PinIcon className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                <span>{site.address}</span>
              </li>
            </ul>

            <ul className="mt-5 flex items-center gap-1">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-ink-soft transition-colors duration-[var(--dur-base)] hover:bg-muted hover:text-ink"
                  >
                    <Icon className="size-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <FooterColumn title="Shop" links={nav.primary} />
          <FooterColumn title="Help" links={nav.help} />

          <div className="col-span-2 lg:col-span-1">
            <h2 className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
              Delivery & payment
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">Inside Dhaka</dt>
                <dd>
                  <Taka amount={delivery.insideDhaka} className="font-medium" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">Outside Dhaka</dt>
                <dd>
                  <Taka amount={delivery.outsideDhaka} className="font-medium" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
                <dt className="text-ink-soft">Free over</dt>
                <dd>
                  <Taka
                    amount={delivery.freeThreshold}
                    className="font-medium text-brand"
                  />
                </dd>
              </div>
            </dl>

            <p className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-brand-tint px-3 py-2 text-[13px] font-medium text-brand">
              <CashIcon className="size-4 shrink-0" />
              Cash on Delivery available
            </p>

            <ul className="mt-3 space-y-0.5">
              {nav.company.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-[30px] items-center text-sm text-ink-soft transition-colors duration-[var(--dur-base)] hover:text-brand"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line py-6 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            <span>Pay on delivery</span>
            <span aria-hidden className="text-line-strong">
              •
            </span>
            <span>bKash</span>
            <span aria-hidden className="text-line-strong">
              •
            </span>
            <span>Nagad</span>
            <span aria-hidden className="text-line-strong">
              •
            </span>
            <span>Card</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
        {title}
      </h2>
      <ul className="mt-3 space-y-0.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-[30px] items-center text-sm text-ink-soft transition-colors duration-[var(--dur-base)] hover:text-brand"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
