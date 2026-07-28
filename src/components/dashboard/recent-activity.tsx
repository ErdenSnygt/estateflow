import Link from "next/link";
import {
  Building2,
  CalendarClock,
  FileText,
  Handshake,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type { ActivityItem, ActivityType } from "@/lib/data/activity";
import { formatCurrencyCompact, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Cümlenin fiili UI'da durur — veri katmanı yalnızca yapıyı taşır. */
const ACTIVITY_META: Record<
  ActivityType,
  { icon: LucideIcon; text: string; className: string }
> = {
  listing_created: {
    icon: Building2,
    text: "portföye eklendi",
    className: "bg-brand-soft text-brand",
  },
  sale_closed: {
    icon: Handshake,
    text: "satışı tamamlandı",
    className: "bg-success-soft text-success",
  },
  offer_received: {
    icon: FileText,
    text: "için teklif alındı",
    className: "bg-warning-soft text-warning",
  },
  customer_added: {
    icon: UserPlus,
    text: "müşteri olarak kaydedildi",
    className: "bg-[color-mix(in_oklab,var(--accent-violet)_16%,transparent)] text-violet",
  },
  appointment_scheduled: {
    icon: CalendarClock,
    text: "ile randevu oluşturuldu",
    className: "bg-surface-inset text-secondary-foreground",
  },
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  /* Sunucu bileşeni: `Date.now()` yalnızca render sırasında bir kez okunur,
     istemcide yeniden hesaplanmadığı için hydration uyuşmazlığı doğmaz.
     Faz 4'te burada sabit DATA_EPOCH vardı; veri gerçek olduğu için artık
     göreli etiketler gerçek saate göre kuruluyor. */
  const now = Date.now();

  return (
    <ul className="divide-y divide-hairline">
      {items.map((item, index) => {
        const meta = ACTIVITY_META[item.type];
        const Icon = meta.icon;

        const row = (
          <div className="flex items-start gap-3 px-5 py-3">
            <span
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                meta.className,
              )}
            >
              <Icon className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug text-secondary-foreground">
                <span className="font-medium text-foreground">
                  {item.subject}
                </span>{" "}
                {meta.text}
                {item.amount !== null && (
                  <>
                    {" · "}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCurrencyCompact(item.amount)}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                {item.actor} · {formatRelativeTime(item.created_at, now)}
              </p>
            </div>

            {/* En yeni olay canlı hissi versin — akış otomatik yenilenmiyor. */}
            {index === 0 && (
              <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-md bg-success-soft px-1.5 py-0.5 text-[10.5px] font-medium text-success">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                Yeni
              </span>
            )}
          </div>
        );

        /* Müşteri olayları müşteri kaydına, diğerleri ilana gider. */
        const href = item.customer_id
          ? `/musteriler/${item.customer_id}`
          : item.listing_id
            ? `/ilanlar/${item.listing_id}`
            : null;

        return (
          <li key={item.id}>
            {href ? (
              <Link
                href={href}
                className="block transition-colors hover:bg-surface-hover"
              >
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
