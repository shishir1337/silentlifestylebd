import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-shell";
import { PageEditor } from "@/components/admin/page-editor";
import { requireContentAccess } from "@/lib/admin/access";
import { getPage } from "@/lib/admin/content-reads";

export const metadata: Metadata = {
  title: "Edit page",
  robots: { index: false, follow: false },
};

export default async function AdminEditPagePage(
  props: PageProps<"/admin/content/pages/[slug]">,
) {
  await requireContentAccess();
  const { slug } = await props.params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <AdminPage
      title={page.title}
      lead={`Shown at /${page.slug}`}
      action={
        <Link
          href="/admin/content/pages"
          className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-line-strong bg-canvas px-3.5 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
        >
          All pages
        </Link>
      }
    >
      <PageEditor page={page} />
    </AdminPage>
  );
}
