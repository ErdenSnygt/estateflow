import type { AppointmentStatus, AppointmentType } from "@/types/database";
import type { AppointmentFilters } from "@/lib/data/appointments";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
} from "@/lib/appointments";
import {
  CALENDAR_VIEWS,
  parseDateKey,
  toDateKey,
  type CalendarView,
  type DateKey,
} from "@/lib/calendar";
import { oneOf, single, type SearchParamsInput } from "@/lib/search-params";

/**
 * URL arama parametreleri ↔ takvim durumu.
 * `sales-filters.ts` ile aynı desen; ortak ayrıştırıcılar `search-params.ts`.
 *
 * Takvimde iki parametre filtre DEĞİL, KONUM: `view` ve `date`. "Temizle"
 * düğmesi onlara dokunmamalı — kullanıcı filtreleri temizlediğinde baktığı
 * haftadan da atılmayı beklemez. Bu yüzden `APPOINTMENT_FILTER_KEYS` içinde
 * yalnızca gerçek filtreler var (`lib/appointments.ts`).
 */

export function parseCalendarView(
  params: SearchParamsInput,
  fallback: CalendarView,
): CalendarView {
  return oneOf<CalendarView>(params, "view", CALENDAR_VIEWS) ?? fallback;
}

export function parseCalendarDate(
  params: SearchParamsInput,
  now: number = Date.now(),
): DateKey {
  return parseDateKey(single(params, "date")) ?? toDateKey(now);
}

export function parseAppointmentFilters(
  params: SearchParamsInput,
): AppointmentFilters {
  return {
    type: oneOf<AppointmentType>(
      params,
      "type",
      [...APPOINTMENT_TYPES],
    ),
    status: oneOf<AppointmentStatus>(
      params,
      "status",
      [...APPOINTMENT_STATUSES],
    ),
    agent: single(params, "agent"),
  };
}

export function countActiveAppointmentFilters(
  params: SearchParamsInput,
): number {
  return (["type", "status", "agent"] as const).filter(
    (key) => single(params, key) !== undefined,
  ).length;
}
