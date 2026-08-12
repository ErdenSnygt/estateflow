"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  CALENDAR_VIEWS,
  formatViewLabel,
  shiftDate,
  toDateKey,
  type CalendarView,
  type DateKey,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Takvimin üst çubuğu: görünüm sekmeleri + tarih gezinmesi.
 *
 * DURUM URL'DE. `SalesTabs` ile aynı gerekçe (paylaşılabilir link, geri tuşu)
 * ama orada iki ayrı route vardı; burada tek route var çünkü üç görünüm AYNI
 * VERİYİ çiziyor — sayfa zaten ay ızgarasının tamamını çekiyor, görünüm
 * değişince yeni bir sorgu gerekmiyor.
 *
 * `router.replace` kullanılıyor, `push` değil: bir haftayı ileri geri
 * gezinen kullanıcı geçmişe on kayıt bırakıp geri tuşunu kullanılamaz hale
 * getirmemeli.
 */
export function CalendarToolbar({
  view,
  date,
  todayKey,
}: {
  view: CalendarView;
  date: DateKey;
  /** Bugünün ofis takvimindeki karşılığı — sunucudan geliyor. */
  todayKey: DateKey;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("appointments");
  const format = useFormatter();

  const navigate = React.useCallback(
    (patch: { view?: CalendarView; date?: DateKey }) => {
      const next = new URLSearchParams(searchParams.toString());
      if (patch.view) next.set("view", patch.view);
      if (patch.date) next.set("date", patch.date);
      router.replace(`/randevular?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const isToday = date === todayKey;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* --- İleri / geri / bugün --- */}
      <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-inset p-1">
        <button
          type="button"
          aria-label={t("toolbar.previous")}
          onClick={() => navigate({ date: shiftDate(view, date, -1) })}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t("toolbar.next")}
          onClick={() => navigate({ date: shiftDate(view, date, 1) })}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <Button
        variant="secondary"
        size="sm"
        disabled={isToday}
        onClick={() => navigate({ date: toDateKey(Date.now()) })}
      >
        {t("toolbar.today")}
      </Button>

      {/* --- Görünüm başlığı ---
          `order` ile mobilde alt satıra alınıyor: dar ekranda başlık ile
          sekmeler yan yana sığmıyor, başlık tam genişlik alıyor. */}
      <p className="order-last w-full text-[14px] font-medium tabular-nums text-foreground md:order-none md:w-auto md:flex-1">
        {formatViewLabel(format, view, date)}
      </p>

      {/* --- Görünüm sekmeleri --- */}
      <div
        role="tablist"
        aria-label={t("toolbar.viewsAria")}
        className="ml-auto flex items-center gap-1 rounded-lg border border-hairline bg-surface-inset p-1 md:ml-0"
      >
        {CALENDAR_VIEWS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={view === candidate}
            onClick={() => navigate({ view: candidate })}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === candidate
                ? "bg-surface text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`view.${candidate}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
