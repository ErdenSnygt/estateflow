"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PERIOD_OPTIONS, DEFAULT_PERIOD } from "@/lib/revenue";
import { cn } from "@/lib/utils";

/**
 * Dönem seçici — Gelirler ve Raporlar ortak kullanıyor.
 *
 * SEÇİM URL'DE (`?d=90`), bileşen durumunda değil: sunucu veriyi ona göre
 * çekiyor ve bağlantı paylaşılabiliyor. Düğme değil BAĞLANTI — tarayıcının
 * geri tuşu da dönem değiştiriyor.
 */
export function PeriodTabs({ current }: { current: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("revenue.period");

  function hrefFor(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    /* Varsayılan dönem URL'e YAZILMIYOR: `/gelirler` ile `/gelirler?d=180`
       aynı sayfa, iki farklı adres olmasın. */
    if (value === DEFAULT_PERIOD) next.delete("d");
    else next.set("d", value);

    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div
      role="tablist"
      aria-label={t("aria")}
      className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-inset p-1"
    >
      {PERIOD_OPTIONS.map((option) => {
        const isActive = option.value === current;
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-surface text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(option.value)}
          </Link>
        );
      })}
    </div>
  );
}
