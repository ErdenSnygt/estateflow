import Link from "next/link";
import {
  BadgeCheck,
  CircleSlash,
  Eye,
  FileText,
  Handshake,
  Phone,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type { CustomerEvent, CustomerEventType } from "@/types/database";
import { CUSTOMER_EVENT_LABELS } from "@/lib/customers";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** İkon ve renk eşlemesi UI'da; veri katmanı yalnızca `type` taşır. */
const EVENT_STYLE: Record<
  CustomerEventType,
  { icon: LucideIcon; className: string }
> = {
  created: { icon: UserPlus, className: "bg-surface-inset text-secondary-foreground" },
  called: { icon: Phone, className: "bg-brand-soft text-brand" },
  viewed: { icon: Eye, className: "bg-brand-soft text-brand" },
  offer_sent: { icon: FileText, className: "bg-warning-soft text-warning" },
  negotiation: { icon: Handshake, className: "bg-warning-soft text-warning" },
  purchased: { icon: BadgeCheck, className: "bg-success-soft text-success" },
  lost: { icon: CircleSlash, className: "bg-danger-soft text-danger" },
};

/**
 * Dikey zaman çizelgesi. Olaylar veri katmanından tarih sırasında gelir;
 * bileşen sıralama yapmaz.
 */
export function CustomerTimeline({ events }: { events: CustomerEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="px-5 py-4 text-[13px] text-muted-foreground">
        Bu müşteri için henüz kayıtlı bir hareket yok.
      </p>
    );
  }

  return (
    <ol className="relative px-5 py-1">
      {events.map((event, index) => {
        const style = EVENT_STYLE[event.type];
        const Icon = style.icon;
        const isLast = index === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3.5 pb-5 last:pb-1">
            {/* Dikey çizgi — son öğede kesilir */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-hairline-strong"
              />
            )}

            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-surface",
                style.className,
              )}
            >
              <Icon className="size-4" />
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-[13.5px] font-medium text-foreground">
                  {CUSTOMER_EVENT_LABELS[event.type]}
                </p>
                <time
                  dateTime={event.created_at}
                  className="text-[11.5px] tabular-nums text-muted-foreground"
                >
                  {formatDate(event.created_at)}
                </time>
              </div>

              <p className="mt-0.5 text-[12.5px] leading-relaxed text-secondary-foreground">
                {event.note}
              </p>

              {event.listing_id && (
                <Link
                  href={`/ilanlar/${event.listing_id}`}
                  className="mt-1 inline-block text-[12px] font-medium text-brand transition-colors hover:text-brand-hover"
                >
                  İlgili ilanı gör →
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
