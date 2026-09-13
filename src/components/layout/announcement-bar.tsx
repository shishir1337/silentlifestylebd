import Link from "next/link";
import { CashIcon, ReturnIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";
import { getAnnouncements, type Announcement } from "@/lib/catalog";
import { cn } from "@/lib/cn";

/**
 * The strip above everything.
 *
 * It used to be two hardcoded facts — cash on delivery, and free delivery over
 * the threshold — because those are what decide whether a Bangladeshi shopper
 * trusts a shop they have not heard of. They still are, and they are still
 * what is in it; the difference is that the client can now say something else
 * during Eid without a developer.
 *
 * Still no countdown and no marquee. Those cost trust rather than build it,
 * and nothing in the editor offers them.
 */
const ICONS = {
  CASH: CashIcon,
  TRUCK: TruckIcon,
  RETURN: ReturnIcon,
  SHIELD: ShieldIcon,
} as const;

export async function AnnouncementBar() {
  const items = await getAnnouncements();
  if (items.length === 0) return null;

  return (
    <div className="bg-ink text-white">
      <Container className="flex h-9 items-center justify-center gap-x-6 text-[11px] sm:h-10 sm:text-xs">
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </Container>
    </div>
  );
}

function Item({ item }: { item: Announcement }) {
  const Icon = item.icon === "NONE" ? null : ICONS[item.icon];

  const body = (
    <>
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      <span>{item.text}</span>
    </>
  );

  const className = cn(
    "items-center gap-1.5",
    // The strip is one line, so the extras appear only where there is room.
    item.wideOnly ? "hidden sm:flex" : "flex",
  );

  return item.href ? (
    <Link href={item.href} className={cn(className, "hover:underline")}>
      {body}
    </Link>
  ) : (
    <p className={className}>{body}</p>
  );
}
