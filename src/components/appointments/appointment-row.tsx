import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import type { AppointmentItem } from "@/lib/data/appointments";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_PALETTE,
} from "@/lib/appointments";
import {
  formatDayShort,
  formatTimeRange,
  toDateKey,
  type DateKey,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Randevunun mini liste satırı.
 *
 * SUNUCU BİLEŞENİ ve öyle kalmalı: müşteri detayı, ilan detayı ve dashboard
 * bu satırı gösteriyor ve üçünde de randevu üzerinde işlem yapılmıyor —
 * takvimdeki panel için gereken istemci kodunu üç sayfaya birden taşımanın
 * anlamı yok. Satıra tıklamak randevunun günündeki takvime götürüyor.
 */
export function AppointmentRow({
  appointment,
  /** Tarih zaten bağlamdan belliyse (ör. "bugün" listesi) gizlenebilir. */
  showDate = true,
  showType = true,
}: {
  appointment: AppointmentItem;
  showDate?: boolean;
  showType?: boolean;
}) {
  const palette = APPOINTMENT_TYPE_PALETTE[appointment.appointment_type];
  const day: DateKey = toDateKey(appointment.start_time);

  return (
    <Link
      href={`/randevular?view=gun&date=${day}`}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-hairline bg-surface-inset px-3 py-2.5 transition-colors hover:bg-surface-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        appointment.status === "iptal" && "opacity-55",
      )}
    >
      <span
        aria-hidden
        className={cn("mt-1 h-8 w-1 shrink-0 rounded-full", palette.accent)}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "truncate text-[13px] font-medium text-foreground",
              appointment.status === "iptal" && "line-through",
            )}
          >
            {appointment.title}
          </p>
          {appointment.status !== "planlandi" && (
            <Badge
              variant={APPOINTMENT_STATUS_TONES[appointment.status]}
              className="shrink-0"
            >
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>
          )}
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <Clock className="size-3" />
            {showDate && `${formatDayShort(day)} · `}
            {formatTimeRange(appointment.start_time, appointment.end_time)}
          </span>

          {showType && (
            <>
              <span aria-hidden>·</span>
              <span>
                {APPOINTMENT_TYPE_LABELS[appointment.appointment_type]}
              </span>
            </>
          )}

          {appointment.location && (
            <span className="flex min-w-0 items-center gap-1">
              <span aria-hidden>·</span>
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{appointment.location}</span>
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
