import { CashIcon, TruckIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";
import { delivery } from "@/data/site";
import { Taka } from "@/components/ui/price";

/**
 * The two facts that decide whether a Bangladeshi shopper trusts a new store,
 * placed before anything else: you can pay on delivery, and here is what
 * shipping costs. No countdown, no marquee — those cost trust, not build it.
 */
export function AnnouncementBar() {
  return (
    <div className="bg-ink text-white">
      <Container className="flex h-9 items-center justify-center gap-x-6 text-[11px] sm:h-10 sm:text-xs">
        <p className="flex items-center gap-1.5">
          <CashIcon className="size-3.5 shrink-0" />
          <span>Cash on Delivery nationwide</span>
        </p>
        <p className="hidden items-center gap-1.5 sm:flex">
          <TruckIcon className="size-3.5 shrink-0" />
          <span>
            Free delivery over{" "}
            <Taka amount={delivery.freeThreshold} className="font-semibold" />
          </span>
        </p>
      </Container>
    </div>
  );
}
