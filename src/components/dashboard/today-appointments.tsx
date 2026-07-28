import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { getTodayAppointments } from "@/lib/data/appointments";
import { formatDayLong, toDateKey } from "@/lib/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppointmentRow } from "@/components/appointments/appointment-row";

/**
 * Dashboard'ın "Bugünkü Randevular" kartı.
 *
 * İPTAL EDİLENLER SORGUDA ELENİYOR (`getTodayAppointments`): dashboard bugünün
 * NE OLACAĞINI anlatıyor, düşen bir planı hatırlatmıyor. Takvimde ise iptaller
 * soluk da olsa duruyor — orada gün geriye dönük de okunuyor.
 *
 * Kart yalnızca randevu VARSA çiziliyor. Boş bir "bugün randevunuz yok" kartı,
 * dashboard'ın en değerli bölgesinde hiçbir şey söylemeyen bir kutu olurdu.
 */
export async function TodayAppointments() {
  const appointments = await getTodayAppointments();
  if (appointments.length === 0) return null;

  const today = toDateKey(Date.now());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand" />
          Bugünkü Randevular
        </CardTitle>
        <CardDescription>
          {formatDayLong(today)} · {appointments.length} randevu
        </CardDescription>
        <CardAction>
          <Link
            href="/randevular?view=gun"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-secondary-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Takvim
            <ArrowRight className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {appointments.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              showDate={false}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
