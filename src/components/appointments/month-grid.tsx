"use client";

import * as React from "react";
import { useFormatter } from "next-intl";

import type { AppointmentItem } from "@/lib/data/appointments";
import { APPOINTMENT_TYPE_PALETTE } from "@/lib/appointments";
import {
  dayNumber,
  formatMinutes,
  formatWeekdayShort,
  isSameMonth,
  minutesOfDay,
  monthGrid,
  toDateKey,
  type DateKey,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

import { AppointmentPopover } from "./appointment-popover";

/**
 * Aylık görünüm.
 *
 * SÜRÜKLE-BIRAK YOK ve bu bilinçli: bir ay hücresinde saat bilgisi zaten
 * görünmüyor, randevuyu başka bir güne taşımak saati koruyacağı için
 * kullanıcıya "ne yaptığını" göstermeyen bir işlem olurdu. Ay görünümü bir
 * ÖZET; düzenleme günlük/haftalık ızgarada ya da formda yapılıyor.
 *
 * MOBİLDE HÜCRELER ÇİPLERİ DEĞİL NOKTALARI gösteriyor: 375 piksellik bir
 * ekranda yedi sütuna bölünen hücre ~50 piksel ve içine bir randevu başlığı
 * sığmıyor. Renkli noktalar "bu gün doluydu" bilgisini taşıyor, ayrıntı için
 * güne dokunmak yeterli — hücreye dokunmak o günün günlük görünümünü açıyor.
 */

/** Bir hücrede en fazla kaç randevu gösterilecek; kalanı "+N" oluyor. */
const MAX_CHIPS = 3;
const MAX_DOTS = 4;

export function MonthGrid({
  date,
  appointments,
  todayKey,
  onCreate,
  onEdit,
  onSelectDay,
}: {
  date: DateKey;
  appointments: AppointmentItem[];
  todayKey: DateKey;
  onCreate: (date: DateKey, minutes: number) => void;
  onEdit: (appointment: AppointmentItem) => void;
  /** Hücreye tıklanınca o günün günlük görünümüne geçiş. */
  onSelectDay: (date: DateKey) => void;
}) {
  const format = useFormatter();
  const [openId, setOpenId] = React.useState<string | null>(null);

  const weeks = React.useMemo(() => monthGrid(date), [date]);

  const byDay = React.useMemo(() => {
    const map = new Map<DateKey, AppointmentItem[]>();
    for (const appointment of appointments) {
      const key = toDateKey(appointment.start_time);
      const bucket = map.get(key);
      if (bucket) bucket.push(appointment);
      else map.set(key, [appointment]);
    }
    return map;
  }, [appointments]);

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
      {/* --- Gün adları --- */}
      <div className="grid grid-cols-7 border-b border-hairline bg-surface-inset">
        {/* Gün adları SABİT BİR DİZİDEN DEĞİL, ızgaranın ilk satırından
            türetiliyor: o satır her zaman pazartesi–pazar ve biçimlendirici
            adları aktif dilde veriyor (`lib/calendar.ts` → Faz 21). */}
        {weeks[0].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground"
          >
            {formatWeekdayShort(format, day)}
          </div>
        ))}
      </div>

      {/* --- Hücreler --- */}
      <div>
        {weeks.map((week) => (
          <div
            key={week[0]}
            className="grid grid-cols-7 border-b border-hairline last:border-b-0"
          >
            {week.map((day) => {
              const items = byDay.get(day) ?? [];
              const isCurrentMonth = isSameMonth(day, date);

              return (
                <div
                  key={day}
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "group min-h-[86px] cursor-pointer border-l border-hairline p-1.5 transition-colors first:border-l-0 hover:bg-surface-hover sm:min-h-[112px]",
                    !isCurrentMonth && "bg-canvas/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-[12.5px] font-medium tabular-nums",
                        day === todayKey && "bg-brand text-brand-foreground",
                        day !== todayKey && isCurrentMonth && "text-foreground",
                        day !== todayKey && !isCurrentMonth && "text-muted-foreground",
                      )}
                    >
                      {dayNumber(day)}
                    </span>

                    {items.length > MAX_CHIPS && (
                      <span className="hidden text-[10.5px] tabular-nums text-muted-foreground sm:inline">
                        +{items.length - MAX_CHIPS}
                      </span>
                    )}
                  </div>

                  {/* Mobil: noktalar */}
                  <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                    {items.slice(0, MAX_DOTS).map((appointment) => (
                      <span
                        key={appointment.id}
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full",
                          APPOINTMENT_TYPE_PALETTE[appointment.appointment_type]
                            .accent,
                          appointment.status === "iptal" && "opacity-40",
                        )}
                      />
                    ))}
                    {items.length > MAX_DOTS && (
                      <span className="text-[10px] leading-none tabular-nums text-muted-foreground">
                        +{items.length - MAX_DOTS}
                      </span>
                    )}
                  </div>

                  {/* Masaüstü: çipler */}
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {items.slice(0, MAX_CHIPS).map((appointment) => (
                      <MonthChip
                        key={appointment.id}
                        appointment={appointment}
                        isOpen={openId === appointment.id}
                        onOpenChange={(open) =>
                          setOpenId(open ? appointment.id : null)
                        }
                        onEdit={onEdit}
                      />
                    ))}

                    {items.length === 0 && isCurrentMonth && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onCreate(day, 9 * 60);
                        }}
                        className="w-full rounded px-1 py-0.5 text-left text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        + Randevu
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function MonthChip({
  appointment,
  isOpen,
  onOpenChange,
  onEdit,
}: {
  appointment: AppointmentItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (appointment: AppointmentItem) => void;
}) {
  const palette = APPOINTMENT_TYPE_PALETTE[appointment.appointment_type];

  return (
    <AppointmentPopover
      appointment={appointment}
      open={isOpen}
      onOpenChange={onOpenChange}
      onEdit={onEdit}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(true);
        }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-surface-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          appointment.status === "iptal" && "opacity-45 line-through",
          appointment.status === "tamamlandi" && "opacity-70",
        )}
      >
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", palette.accent)}
        />
        <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
          {formatMinutes(minutesOfDay(appointment.start_time))}
        </span>
        <span className="truncate text-[11px] text-foreground">
          {appointment.title}
        </span>
      </button>
    </AppointmentPopover>
  );
}
