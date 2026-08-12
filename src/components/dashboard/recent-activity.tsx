import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import {
  Building2,
  CalendarClock,
  FileText,
  Handshake,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type { ActivityItem, ActivityType } from "@/lib/data/activity";
import { formatCurrencyCompact } from "@/lib/format";
import { formatRelative } from "@/i18n/dates";
import { cn } from "@/lib/utils";

/**
 * Olayın ikonu, rengi ve ÇEVİRİ ANAHTARI.
 *
 * Cümlenin fiili UI'da durur — veri katmanı yalnızca yapıyı taşır. Faz 20'de
 * metnin kendisi de buradan çıktı: artık yalnızca anahtar var, cümle
 * `messages/<dil>.json` içinde.
 *
 * CÜMLE PARÇA PARÇA BİRLEŞTİRİLMİYOR. Önceki sürüm "özne + fiil" diye ikiye
 * bölüyordu ve Türkçede bu işe yarıyordu ("Kadıköy dairesi portföye
 * eklendi"). İngilizcede sözcük sırası değişiyor — "an offer came in for
 * Kadıköy dairesi" — yani özne cümlenin ortasında kalabiliyor. Bu yüzden
 * kalıbın TAMAMI tek bir çeviri metni ve özne bir yer tutucu. Kalın yazım
 * metnin içinde `<b>` ile işaretli; `t.rich` onu React elemanına çeviriyor.
 */
/* Anahtar DÜZ `string` DEĞİL: öyle olsaydı `t.rich()` çağrısı sözlükte
   olmayan bir anahtarı da kabul ederdi ve hata çalışma zamanına kalırdı.
   Birlik tipi, `types/i18n.d.ts` güvenlik ağının bu çağrıda da işlemesini
   sağlıyor. */
type ActivityMessageKey =
  | "listingCreated"
  | "saleClosed"
  | "offerReceived"
  | "customerAdded"
  | "appointmentScheduled";

const ACTIVITY_META: Record<
  ActivityType,
  { icon: LucideIcon; messageKey: ActivityMessageKey; className: string }
> = {
  listing_created: {
    icon: Building2,
    messageKey: "listingCreated",
    className: "bg-brand-soft text-brand",
  },
  sale_closed: {
    icon: Handshake,
    messageKey: "saleClosed",
    className: "bg-success-soft text-success",
  },
  offer_received: {
    icon: FileText,
    messageKey: "offerReceived",
    className: "bg-warning-soft text-warning",
  },
  customer_added: {
    icon: UserPlus,
    messageKey: "customerAdded",
    className: "bg-[color-mix(in_oklab,var(--accent-violet)_16%,transparent)] text-violet",
  },
  appointment_scheduled: {
    icon: CalendarClock,
    messageKey: "appointmentScheduled",
    className: "bg-surface-inset text-secondary-foreground",
  },
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  const t = useTranslations("dashboard.activity");
  const format = useFormatter();

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
                {t.rich(meta.messageKey, {
                  subject: item.subject,
                  b: (chunks) => (
                    <span className="font-medium text-foreground">{chunks}</span>
                  ),
                })}
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
                {item.actor} · {formatRelative(format, item.created_at, now)}
              </p>
            </div>

            {/* En yeni olay canlı hissi versin — akış otomatik yenilenmiyor. */}
            {index === 0 && (
              <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-md bg-success-soft px-1.5 py-0.5 text-[10.5px] font-medium text-success">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                {t("new")}
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
