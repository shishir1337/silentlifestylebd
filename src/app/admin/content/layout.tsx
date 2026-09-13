import { ContentTabs } from "@/components/admin/content-tabs";
import { requireContentAccess } from "@/lib/admin/access";

/**
 * The content section's shared tabs.
 *
 * This layout draws; it does not gate. Each page under it calls the DAL for
 * itself, because a layout does not control whether its child segments render.
 * The `requireContentAccess()` here only stops a signed-out visitor seeing the
 * tabs paint before the page redirects them.
 */
export default async function ContentLayout({ children }: LayoutProps<"/admin/content">) {
  await requireContentAccess();

  return (
    <div>
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6">
        <ContentTabs />
      </div>
      {children}
    </div>
  );
}
