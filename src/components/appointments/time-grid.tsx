"use client";

import * as React from "react";

import type { AppointmentItem } from "@/lib/data/appointments";
import { APPOINTMENT_TYPE_PALETTE } from "@/lib/appointments";
import {
  MINUTES_PER_DAY,
  SLOT_MINUTES,
  WEEKDAY_SHORT,
  clampStart,
  dayNumber,
  formatMinutes,
  layoutOverlaps,
  minutesOfDay,
  snapToSlot,
  toDateKey,
  weekdayIndex,
  type DateKey,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

import { AppointmentPopover } from "./appointment-popover";

/**
 * ============================================================================
 * SAATLİK IZGARA — günlük ve haftalık görünümün ortak gövdesi
 * ============================================================================
 * Tek bileşen, iki görünüm: `days` bir günlük gelirse günlük, yedi günlük
 * gelirse haftalık ızgara çiziliyor. Ayrı iki bileşen olsaydı çakışma
 * yerleşimi, sürükle-bırak ve şimdi çizgisi iki kez yazılırdı.
 *
 * -----------------------------------------------------------------------------
 * SÜRÜKLE-BIRAK: KÜTÜPHANE YOK, POINTER EVENTS
 * -----------------------------------------------------------------------------
 * dnd-kit (core + modifiers, ~13 kB gzip) ya da react-dnd değerlendirildi ve
 * ikisi de bu iş için fazla geldi. O kütüphaneler "hangi öğe nereye düştü"
 * sorusunu çözer — sıralanabilir listeler, çoklu sürükleme kaynağı, çarpışma
 * algoritmaları. Buradaki soru ise tek satırlık bir aritmetik:
 *
 *     yeni_başlangıç = eski_başlangıç + (sürüklenen_piksel / dakika_başına_piksel)
 *
 * Hedef, serbest bir bırakma alanı değil sabit bir ızgara; sütun genişliği ve
 * saat yüksekliği zaten bizde. Bu yüzden yalnızca Pointer Events kullanıldı:
 * ek bağımlılık yok, sürüklenen randevu gerçek konumunda önizleniyor.
 *
 * Dinleyiciler `setPointerCapture` yerine WINDOW üzerinde: sürüklenen randevu
 * başka bir güne geçtiğinde React onu farklı bir sütuna taşıyor, yani DOM
 * düğümü yeniden kuruluyor ve yakalama (capture) o anda kopardı.
 *
 * DOKUNMATİKTE SÜRÜKLEME KAPALI. Dikey sürükleme ile sayfa kaydırma aynı
 * hareket; `touch-action: none` ile ayrıştırmak takvimin kaydırılamaz hale
 * gelmesi demekti. Telefonda saat değiştirmek için düzenleme formu var —
 * mobil zaten günlük görünümde ve tek sütun.
 */

/** Bir saatin piksel yüksekliği. 30 dakikalık slot 28 piksele düşüyor. */
const HOUR_HEIGHT = 56;
const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;
const GRID_HEIGHT = 24 * HOUR_HEIGHT;

/** İlk açılışta kaydırılacak saat — ofis günü burada başlıyor. */
const SCROLL_TO_HOUR = 8;

/** Sürükleme sayılması için gereken en küçük hareket (piksel). */
const DRAG_THRESHOLD = 4;

/** Kenara bu kadar yaklaşınca otomatik kaydırma başlar. */
const AUTOSCROLL_EDGE = 48;
const AUTOSCROLL_STEP = 10;

type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  /** Randevunun süresi — sürükleme boyunca korunuyor. */
  duration: number;
  /** İmlecin randevu bloğunun neresinden tuttuğu (dakika). */
  grabOffset: number;
  moved: boolean;
  /** Önizlemenin gösterdiği hedef. */
  date: DateKey;
  startMinutes: number;
};

export type TimeGridProps = {
  days: DateKey[];
  appointments: AppointmentItem[];
  todayKey: DateKey;
  onCreate: (date: DateKey, minutes: number) => void;
  onEdit: (appointment: AppointmentItem) => void;
  onMove: (
    appointment: AppointmentItem,
    date: DateKey,
    startMinutes: number,
  ) => void;
  /** Sürükleme kapalıysa (ör. yalnız okunur bağlam) çipler sabit kalır. */
  canDrag?: boolean;
};

export function TimeGrid({
  days,
  appointments,
  todayKey,
  onCreate,
  onEdit,
  onMove,
  canDrag = true,
}: TimeGridProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const columnsRef = React.useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const suppressClick = React.useRef(false);

  /* Izgara 24 saat çiziliyor ama gün 08:00'de başlıyor: 00:00'a bakarak açılan
     bir takvim, kullanıcıyı her seferinde aşağı kaydırmaya zorlardı. */
  React.useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = SCROLL_TO_HOUR * HOUR_HEIGHT;
  }, []);

  /* --- Şimdi çizgisi ---
     Sunucu "şimdi"yi bilemez; ilk boyamada çizgi yok, hydration'dan sonra
     beliriyor ve dakikada bir tazeleniyor. */
  const [nowMinutes, setNowMinutes] = React.useState<number | null>(null);
  const [nowKey, setNowKey] = React.useState<DateKey | null>(null);

  React.useEffect(() => {
    function tick() {
      setNowMinutes(minutesOfDay(Date.now()));
      setNowKey(toDateKey(Date.now()));
    }
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  /* --- Sürükleme dinleyicileri --- */
  React.useEffect(() => {
    if (!drag) return;
    const active = drag;

    function columnFromX(clientX: number): DateKey {
      const rects = columnsRef.current.map((element) =>
        element?.getBoundingClientRect(),
      );
      for (let index = 0; index < rects.length; index += 1) {
        const rect = rects[index];
        if (rect && clientX >= rect.left && clientX <= rect.right) {
          return days[index];
        }
      }
      /* İmleç ızgaranın dışındaysa en yakın kenardaki güne yapışıyor. */
      return clientX < (rects[0]?.left ?? 0) ? days[0] : days[days.length - 1];
    }

    function handleMove(event: PointerEvent) {
      if (event.pointerId !== active.pointerId) return;
      event.preventDefault();

      const container = scrollRef.current;
      const grid = columnsRef.current[0];
      if (!container || !grid) return;

      /* Kenara yaklaşınca ızgarayı kaydır: 24 saatlik ızgara görünür alana
         sığmıyor, kaydırma olmadan sabahtan akşama sürüklenemezdi. */
      const bounds = container.getBoundingClientRect();
      if (event.clientY < bounds.top + AUTOSCROLL_EDGE) {
        container.scrollTop -= AUTOSCROLL_STEP;
      } else if (event.clientY > bounds.bottom - AUTOSCROLL_EDGE) {
        container.scrollTop += AUTOSCROLL_STEP;
      }

      const gridRect = grid.getBoundingClientRect();
      const minutesAtPointer = (event.clientY - gridRect.top) / PIXELS_PER_MINUTE;
      const nextStart = clampStart(
        minutesAtPointer - active.grabOffset,
        active.duration,
      );
      const nextDate = days.length > 1 ? columnFromX(event.clientX) : days[0];

      const moved =
        active.moved ||
        Math.abs(event.clientX - active.startX) > DRAG_THRESHOLD ||
        Math.abs(event.clientY - active.startY) > DRAG_THRESHOLD;

      /* State yalnızca ÖNİZLEME DEĞİŞTİĞİNDE tazeleniyor: 15 dakikalık adıma
         yuvarlandığı için imleç bir slot içinde gezindiği sürece render yok. */
      if (
        moved === active.moved &&
        nextStart === active.startMinutes &&
        nextDate === active.date
      ) {
        return;
      }

      setDrag({ ...active, moved, startMinutes: nextStart, date: nextDate });
    }

    function handleUp(event: PointerEvent) {
      if (event.pointerId !== active.pointerId) return;

      const current = active;
      setDrag(null);

      if (!current.moved) return;

      suppressClick.current = true;
      const appointment = appointments.find((item) => item.id === current.id);
      if (!appointment) return;

      const originDate = toDateKey(appointment.start_time);
      const originStart = minutesOfDay(appointment.start_time);
      if (current.date === originDate && current.startMinutes === originStart) {
        return;
      }

      onMove(appointment, current.date, current.startMinutes);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [appointments, days, drag, onMove]);

  /* --- Randevuları günlere dağıt ---
     Sürüklenen randevu, ÖNİZLEME KONUMUYLA yerleştiriliyor: hedef sütuna
     gerçekten taşınıyor, çakışma hesabı da yeni konuma göre yapılıyor. */
  const byDay = React.useMemo(() => {
    const map = new Map<DateKey, PositionedAppointment[]>(
      days.map((day) => [day, []]),
    );

    for (const appointment of appointments) {
      const isDragged = drag?.id === appointment.id;

      const date = isDragged ? drag!.date : toDateKey(appointment.start_time);
      const bucket = map.get(date);
      if (!bucket) continue;

      const duration = durationOf(appointment);
      const startMinutes = isDragged
        ? drag!.startMinutes
        : minutesOfDay(appointment.start_time);

      bucket.push({
        id: appointment.id,
        startMinutes,
        endMinutes: Math.min(startMinutes + duration, MINUTES_PER_DAY),
        appointment,
      });
    }

    return map;
  }, [appointments, days, drag]);

  function beginDrag(
    event: React.PointerEvent<HTMLElement>,
    appointment: AppointmentItem,
    startMinutes: number,
  ) {
    /* Sol tuş dışındaki tuşlar ve dokunmatik giriş sürüklemeyi başlatmıyor. */
    if (event.button !== 0 || event.pointerType === "touch") return;
    if (!canDrag || appointment.status !== "planlandi") return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.preventDefault();

    setDrag({
      id: appointment.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      duration: durationOf(appointment),
      grabOffset: (event.clientY - rect.top) / PIXELS_PER_MINUTE,
      moved: false,
      date: toDateKey(appointment.start_time),
      startMinutes,
    });
  }

  function handleColumnClick(
    event: React.MouseEvent<HTMLDivElement>,
    day: DateKey,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = snapToSlot(
      (event.clientY - rect.top) / PIXELS_PER_MINUTE,
      SLOT_MINUTES,
    );
    onCreate(day, Math.min(Math.max(minutes, 0), MINUTES_PER_DAY - SLOT_MINUTES));
  }

  const columnTemplate = `repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-hairline bg-surface",
        drag?.moved && "select-none",
      )}
    >
      {/* --- Gün başlıkları --- */}
      <div className="flex border-b border-hairline bg-surface-inset">
        <div className="w-12 shrink-0 sm:w-14" />
        <div className="grid flex-1" style={{ gridTemplateColumns: columnTemplate }}>
          {days.map((day) => (
            <div
              key={day}
              className="flex items-center justify-center gap-1.5 border-l border-hairline py-2.5 first:border-l-0"
            >
              <span className="text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
                {WEEKDAY_SHORT[weekdayIndex(day)]}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[13px] font-medium tabular-nums",
                  day === todayKey
                    ? "bg-brand text-brand-foreground"
                    : "text-foreground",
                )}
              >
                {dayNumber(day)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* --- Izgara gövdesi --- */}
      <div
        ref={scrollRef}
        className="max-h-[min(62vh,660px)] overflow-y-auto overscroll-contain"
      >
        <div className="flex" style={{ height: GRID_HEIGHT }}>
          {/* Saat sütunu */}
          <div className="w-12 shrink-0 sm:w-14">
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="relative"
              >
                {hour > 0 && (
                  <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-muted-foreground">
                    {formatMinutes(hour * 60)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Gün sütunları.
              Saat çizgileri her sütuna ayrı ayrı çizilmiyor — tekrar eden bir
              arka plan gradyanı 168 boş div'in yerini tutuyor. */}
          <div
            className="relative grid flex-1"
            style={{
              gridTemplateColumns: columnTemplate,
              backgroundImage:
                "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: `100% ${HOUR_HEIGHT}px`,
            }}
          >
            {days.map((day, index) => (
              <div
                key={day}
                ref={(element) => {
                  columnsRef.current[index] = element;
                }}
                onClick={(event) => handleColumnClick(event, day)}
                className={cn(
                  "relative border-l border-hairline first:border-l-0",
                  day === todayKey && "bg-brand-soft/25",
                )}
              >
                {layoutOverlaps(byDay.get(day) ?? []).map((placement) => (
                  <AppointmentBlock
                    key={placement.item.id}
                    placement={placement}
                    isDragging={drag?.id === placement.item.id && drag.moved}
                    isOpen={openId === placement.item.id}
                    canDrag={
                      canDrag && placement.item.appointment.status === "planlandi"
                    }
                    onOpenChange={(open) =>
                      setOpenId(open ? placement.item.id : null)
                    }
                    onEdit={onEdit}
                    onPointerDown={(event) =>
                      beginDrag(
                        event,
                        placement.item.appointment,
                        placement.item.startMinutes,
                      )
                    }
                    suppressClick={suppressClick}
                  />
                ))}

                {/* Şimdi çizgisi — yalnızca bugünün sütununda. */}
                {nowMinutes !== null && day === nowKey && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    style={{ top: nowMinutes * PIXELS_PER_MINUTE }}
                    aria-hidden
                  >
                    <span className="size-2 -translate-x-1/2 rounded-full bg-danger" />
                    <span className="h-px flex-1 bg-danger" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type PositionedAppointment = {
  id: string;
  startMinutes: number;
  endMinutes: number;
  appointment: AppointmentItem;
};

function durationOf(appointment: AppointmentItem): number {
  const minutes =
    (Date.parse(appointment.end_time) - Date.parse(appointment.start_time)) /
    60_000;
  return Math.max(Math.round(minutes), SLOT_MINUTES / 2);
}

function AppointmentBlock({
  placement,
  isDragging,
  isOpen,
  canDrag,
  onOpenChange,
  onEdit,
  onPointerDown,
  suppressClick,
}: {
  placement: {
    item: PositionedAppointment;
    column: number;
    columns: number;
  };
  isDragging: boolean;
  isOpen: boolean;
  canDrag: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (appointment: AppointmentItem) => void;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  suppressClick: React.RefObject<boolean>;
}) {
  const { item, column, columns } = placement;
  const appointment = item.appointment;
  const palette = APPOINTMENT_TYPE_PALETTE[appointment.appointment_type];

  const height = (item.endMinutes - item.startMinutes) * PIXELS_PER_MINUTE;
  /* Kısa randevular tek satıra düşüyor; 44 piksel iki satırın sığdığı eşik. */
  const isCompact = height < 44;

  return (
    <AppointmentPopover
      appointment={appointment}
      open={isOpen}
      onOpenChange={onOpenChange}
      onEdit={onEdit}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${appointment.title}, ${formatMinutes(item.startMinutes)}`}
        onPointerDown={onPointerDown}
        onClick={(event) => {
          event.stopPropagation();
          /* Sürükleme bittiğinde tarayıcı yine de bir tıklama üretiyor;
             o tıklama paneli açmamalı. */
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onOpenChange(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onOpenChange(true);
          }
        }}
        style={{
          top: item.startMinutes * PIXELS_PER_MINUTE,
          height: Math.max(height, 18),
          left: `calc(${(column / columns) * 100}% + 2px)`,
          width: `calc(${100 / columns}% - 4px)`,
        }}
        className={cn(
          "absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          palette.block,
          canDrag ? "cursor-grab" : "cursor-pointer",
          isDragging && "z-30 cursor-grabbing opacity-90 shadow-lg",
          appointment.status === "iptal" && "opacity-45 line-through",
          appointment.status === "tamamlandi" && "opacity-70",
        )}
      >
        <p
          className={cn(
            "truncate text-[11.5px] font-medium leading-tight text-foreground",
            isCompact && "text-[11px]",
          )}
        >
          {appointment.title}
        </p>
        {!isCompact && (
          <p className="mt-0.5 truncate text-[10.5px] tabular-nums text-secondary-foreground">
            {formatMinutes(item.startMinutes)}
            {appointment.customer ? ` · ${appointment.customer.full_name}` : ""}
          </p>
        )}
      </div>
    </AppointmentPopover>
  );
}
