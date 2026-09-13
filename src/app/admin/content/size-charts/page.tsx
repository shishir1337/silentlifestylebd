import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { SizeChartManager } from "@/components/admin/size-chart-manager";
import { requireContentAccess } from "@/lib/admin/access";
import { listSizeCharts } from "@/lib/admin/content-reads";

export const metadata: Metadata = {
  title: "Size charts",
  robots: { index: false, follow: false },
};

export default async function AdminSizeChartsPage() {
  await requireContentAccess();
  const charts = await listSizeCharts();

  return (
    <AdminPage
      title="Size charts"
      lead="The cheapest way to prevent a return. Every product with sizes links here."
    >
      <SizeChartManager charts={charts} />
    </AdminPage>
  );
}
