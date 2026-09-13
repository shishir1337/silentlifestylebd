import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { PageBody } from "@/components/content/page-body";
import { ButtonLink } from "@/components/ui/button";
import { getStorePage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import storefront from "@/assets/hero/hero-3-formals.jpg";

const SLUG = "about";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStorePage(SLUG);
  if (!page) return { title: "About us" };
  return {
    title: page.seoTitle ?? page.title,
    description:
      page.seoDescription ?? page.lead ?? (await getSiteSettings()).description,
    alternates: { canonical: "/about" },
  };
}

/**
 * About.
 *
 * The words come from the database and are edited in the admin panel — this is
 * the page most likely to be rewritten, because the shipped copy is deliberate
 * placeholder: true of the storefront as built, inventing no award, founding
 * date, factory or customer count, but not the client's story.
 *
 * The photograph and the three buttons underneath stay in code. They are
 * layout rather than copy, and a text editor is the wrong place to decide
 * whether a page has a hero image.
 */
export default async function AboutPage() {
  const page = await getStorePage(SLUG);
  if (!page) notFound();

  return (
    <Container>
      <PageHeader
        breadcrumb="About us"
        title={page.title}
        lead={page.lead ?? undefined}
      />

      <div className="relative aspect-16/9 overflow-hidden rounded-[var(--radius-lg)] bg-muted sm:aspect-21/9">
        <Image
          src={storefront}
          alt="Formal shirts and blazers on display in the store"
          fill
          priority
          sizes="100vw"
          quality={75}
          placeholder="blur"
          className="object-cover"
        />
      </div>

      <PageBody sections={page.sections} />

      <div className="flex flex-col gap-2.5 border-t border-line py-6 sm:flex-row">
        <ButtonLink href="/collections" className="sm:flex-1">
          Shop the collection
        </ButtonLink>
        <ButtonLink href="/contact" variant="secondary" className="sm:flex-1">
          Contact us
        </ButtonLink>
        <ButtonLink href="/stores" variant="secondary" className="sm:flex-1">
          Find our store
        </ButtonLink>
      </div>
    </Container>
  );
}
