import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import {
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { getSiteSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: "Contact us",
    description: `Call, WhatsApp or visit ${site.name}. ${site.address}.`,
    alternates: { canonical: "/contact" },
  };
}

/**
 * Contact.
 *
 * No message form. There is no inbox behind one yet, and a form that silently
 * goes nowhere costs more trust than it earns — in Bangladesh a phone number
 * and a WhatsApp link are how customers actually reach a shop anyway.
 */
export default async function ContactPage() {
  const site = await getSiteSettings();
  // Same source as the footer: Settings, falling back to the shop number.
  const whatsAppNumber = site.social.whatsapp || site.phone;
  const whatsApp = whatsAppNumber
    ? `https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, "")}`
    : "";
  const socials = [
    { href: site.social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: site.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: whatsApp, label: "WhatsApp", Icon: WhatsAppIcon },
  ].filter((s) => s.href);

  return (
    <Container>
      <PageHeader
        breadcrumb="Contact us"
        title="Contact us"
        lead="Call or message us — someone answers between 10am and 9pm, seven days a week."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ContactCard
          href={`tel:${site.phone}`}
          Icon={PhoneIcon}
          label="Call us"
          value={site.phoneDisplay}
          note="Fastest for order changes and size questions."
          primary
        />
        <ContactCard
          href={whatsApp}
          Icon={WhatsAppIcon}
          label="WhatsApp"
          value={site.phoneDisplay}
          note="Send a photo if something arrived wrong."
          external
        />
        <ContactCard
          href={`mailto:${site.email}`}
          Icon={MailIcon}
          label="Email"
          value={site.email}
          note="For wholesale and partnership enquiries."
        />
        <ContactCard
          href="https://maps.google.com"
          Icon={PinIcon}
          label="Visit the store"
          value={site.address}
          note="Open 10am–9pm, closed Friday afternoon."
          external
        />
      </div>

      <Section id="hours" title="Opening hours">
        <Bullets
          items={[
            "Saturday to Thursday — 10:00am to 9:00pm",
            "Friday — 3:00pm to 9:00pm",
            "Phone and WhatsApp are answered during the same hours.",
            "Orders placed after 6pm are confirmed the next working day.",
          ]}
        />
      </Section>

      <Section id="faster" title="Before you call">
        <p>
          Most questions have a faster answer than waiting for us to pick up:
        </p>
        <Bullets
          items={[
            <>
              Where is my parcel? — <InlineLink href="/track">Track your order</InlineLink>
            </>,
            <>
              What will delivery cost? —{" "}
              <InlineLink href="/delivery">Delivery & charges</InlineLink>
            </>,
            <>
              Will it fit? — <InlineLink href="/size-guide">Size guide</InlineLink>
            </>,
            <>
              Can I send it back? —{" "}
              <InlineLink href="/returns">Returns & exchange</InlineLink>
            </>,
          ]}
        />
      </Section>

      <Section id="social" title="Find us online">
        <ul className="flex items-center gap-2">
          {socials.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-line text-ink-soft transition-colors duration-[var(--dur-base)] hover:border-ink hover:text-ink"
              >
                <Icon className="size-5" />
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </Container>
  );
}

function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="font-medium text-brand underline underline-offset-2">
      {children}
    </a>
  );
}

function ContactCard({
  href,
  Icon,
  label,
  value,
  note,
  primary,
  external,
}: {
  href: string;
  Icon: (p: { className?: string }) => React.ReactNode;
  label: string;
  value: string;
  note: string;
  primary?: boolean;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className={
        primary
          ? "flex gap-3 rounded-[var(--radius-md)] border-2 border-ink bg-subtle p-4 transition-colors duration-[var(--dur-base)]"
          : "flex gap-3 rounded-[var(--radius-md)] border border-line p-4 transition-colors duration-[var(--dur-base)] hover:border-ink"
      }
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
          {label}
        </span>
        <span className="mt-0.5 block text-[15px] font-medium break-words">{value}</span>
        <span className="mt-1 block text-[12px] leading-snug text-ink-muted">{note}</span>
      </span>
    </a>
  );
}
