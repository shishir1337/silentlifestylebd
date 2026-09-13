import { redirect } from "next/navigation";

/** Content has no landing screen of its own; banners are what people come for. */
export default function ContentIndexPage() {
  redirect("/admin/content/banners");
}
