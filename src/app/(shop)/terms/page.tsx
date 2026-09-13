import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { PageBody } from "@/components/content/page-body";
import { getStorePage } from "@/lib/pages";
import { site } from "@/data/site";

const SLUG = "terms";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStorePage(SLUG);
  if (!page) return { title: "Terms & conditions" };
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.lead ?? site.description,
    alternates: { canonical: `/${SLUG}` },
  };
}

/**
 * Written by the shop, not by a developer.
 *
 * The copy lives in the database and is edited in the admin panel. The
 * structure — heading, sections, bullets — stays in code, so the page cannot
 * be broken by an edit and keeps the same rhythm as every other page here.
 *
 * The "last updated" line is the row's own timestamp. It used to be a string
 * somebody had to remember to change, which on a policy page is exactly the
 * kind of claim that quietly becomes false.
 */
export default async function TermsPage() {
  const page = await getStorePage(SLUG);
  if (!page) notFound();

  return (
    <Container>
      <PageHeader
        breadcrumb="Terms & conditions"
        title={page.title}
        lead={
          page.lead
            ? `${page.lead} Last updated ${new Date(page.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
            : undefined
        }
      />
      <PageBody sections={page.sections} />
    </Container>
  );
}
