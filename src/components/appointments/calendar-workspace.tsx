"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import type { AppointmentItem, CustomerOption } from "@/lib/data/appointments";
import type { AgentOption } from "@/lib/data/agents";
import { updateAppointment } from "@/lib/actions/appointments";
import {
  formatDayShort,
  formatMinutes,
  toIso,
  weekDays,
  type CalendarView,
  type DateKey,
} from "@/lib/calendar";
import { Button } from "@/components/ui/button";

import {
  AppointmentDialog,
  type AppointmentDialogMode,
} from "./appointment-dialog";
import { AppointmentFilterBar } from "./appointment-filter-bar";
import { CalendarToolbar } from "./calendar-toolbar";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";

/**
 * ============================================================================
 * TAKVİM KABUĞU
 * ============================================================================
 * Üç görünümün ortak durumu burada: hangi randevu panelde açık, form hangi
 * modda, sürüklenen randevu nereye taşındı.
 *
 * -----------------------------------------------------------------------------
 * TEK SORGU, ÜÇ GÖRÜNÜM
 * -----------------------------------------------------------------------------
 * Sayfa her zaman AY IZGARASININ TAMAMINI çekiyor (bkz. `/randevular/page.tsx`),
 * görünüm ne olursa olsun. Bakılan gün o ayın içinde olduğuna göre, o günün
 * haftası da ay ızgarasının içinde — yani günlük ve haftalık görünümler ek bir
 * sorgu istemiyor. Sekmeler arasında geçiş anında oluyor, sunucuya gidilmiyor.
 * Maliyeti bir ofisin altı haftalık randevusu; birkaç düzine satır.
 *
 * Izgaralar aralık dışındaki randevuları kendiliğinden yok sayıyor (gün
 * kovalarına dağıtılırken eşleşmeyenler düşüyor), bu yüzden ayrıca filtre
 * uygulanmıyor.
 */
export function CalendarWorkspace({
  view,
  date,
  todayKey,
  appointments,
  customerOptions,
  listingOptions,
  agentOptions,
  currentAgentId,
  hasFilters,
}: {
  view: CalendarView;
  date: DateKey;
  todayKey: DateKey;
  appointments: AppointmentItem[];
  customerOptions: CustomerOption[];
  listingOptions: CustomerOption[];
  /** Boş dizi = danışman: ne filtre ne de form danışman seçtiriyor. */
  agentOptions: AgentOption[];
  currentAgentId: string | null;
  /**
   * Aralık boş kaldığında hangi cümlenin yazılacağını belirliyor.
   *
   * Sunucuda hesaplanıyor (`countActiveAppointmentFilters`), burada
   * `useSearchParams()` üzerinden yeniden türetilmiyor: filtre anahtarları
   * tek bir yerde tanımlı ve iki ayrı sayım er ya da geç birbirinden sapar.
   */
  hasFilters: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dialogMode, setDialogMode] =
    React.useState<AppointmentDialogMode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  /**
   * Sürükleme sonrası İYİMSER KONUM.
   *
   * `updateAppointment` dönene ve `router.refresh()` yeni veriyi getirene
   * kadar (birkaç yüz milisaniye) randevu eski saatine geri zıplardı. Yerel
   * bir kaydırma tablosu bunu engelliyor; sunucudan yeni liste geldiğinde
   * tablo boşaltılıyor çünkü artık gerçek veri aynı şeyi söylüyor.
   */
  const [overrides, setOverrides] = React.useState<
    Record<string, { start: string; end: string }>
  >({});

  React.useEffect(() => setOverrides({}), [appointments]);

  const items = React.useMemo(() => {
    if (Object.keys(overrides).length === 0) return appointments;
    return appointments.map((appointment) => {
      const override = overrides[appointment.id];
      return override
        ? { ...appointment, start_time: override.start, end_time: override.end }
        : appointment;
    });
  }, [appointments, overrides]);

  const days = React.useMemo(
    () => (view === "hafta" ? weekDays(date) : [date]),
    [date, view],
  );

  /* --- Form açma --- */

  function openCreate(day: DateKey, minutes: number) {
    setDialogMode({ kind: "create", date: day, minutes });
    setIsDialogOpen(true);
  }

  function openEdit(appointment: AppointmentItem) {
    setDialogMode({ kind: "edit", appointment });
    setIsDialogOpen(true);
  }

  /* --- Sürükle-bırak --- */

  async function handleMove(
    appointment: AppointmentItem,
    day: DateKey,
    startMinutes: number,
  ) {
    const duration =
      (Date.parse(appointment.end_time) - Date.parse(appointment.start_time)) /
      60_000;

    const startIso = toIso(day, startMinutes);
    const endIso = toIso(day, startMinutes + duration);

    const previousStart = appointment.start_time;
    const previousEnd = appointment.end_time;

    setOverrides((current) => ({
      ...current,
      [appointment.id]: { start: startIso, end: endIso },
    }));

    const result = await updateAppointment(appointment.id, { startIso, endIso });

    if (!result.ok) {
      /* Sunucu reddetti — randevu eski yerine dönüyor. Sessizce bırakmak,
         kullanıcıya kaydedilmemiş bir değişikliği kaydedilmiş gibi
         gösterirdi. */
      setOverrides((current) => ({
        ...current,
        [appointment.id]: { start: previousStart, end: previousEnd },
      }));
      toast.error("Randevu taşınamadı", { description: result.error });
      return;
    }

    toast.success("Randevu taşındı", {
      description: `${formatDayShort(day)} · ${formatMinutes(startMinutes)} – ${formatMinutes(startMinutes + duration)}`,
    });
    router.refresh();
  }

  /* --- Ay ızgarasından güne geçiş --- */

  function selectDay(day: DateKey) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("view", "gun");
    next.set("date", day);
    router.replace(`/randevular?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <CalendarToolbar view={view} date={date} todayKey={todayKey} />
        </div>

        <Button
          onClick={() => openCreate(date, 9 * 60)}
          className="w-full sm:w-auto"
        >
          <CalendarPlus className="size-4" />
          Randevu Ekle
        </Button>
      </div>

      <AppointmentFilterBar agentOptions={agentOptions} />

      {view === "ay" ? (
        <MonthGrid
          date={date}
          appointments={items}
          todayKey={todayKey}
          onCreate={openCreate}
          onEdit={openEdit}
          onSelectDay={selectDay}
        />
      ) : (
        <TimeGrid
          days={days}
          appointments={items}
          todayKey={todayKey}
          onCreate={openCreate}
          onEdit={openEdit}
          onMove={handleMove}
        />
      )}

      {/* IZGARA HER DURUMDA ÇİZİLİYOR — liste sayfalarındaki gibi tam ekran
          bir boş durum yerine yalnızca altına bir cümle. Boş bir takvim de
          işe yarar bir arayüz: kullanıcı yine de bir saate tıklayıp randevu
          açabiliyor. Filtre yüzünden boşalan aralık ise ayrı bir cümle
          alıyor, yoksa "randevu yok" yanıltıcı olurdu. */}
      {appointments.length === 0 && (
        <p className="text-center text-[12.5px] text-muted-foreground">
          {hasFilters
            ? "Bu filtrelerle eşleşen randevu yok. Filtreleri temizleyip tekrar bakın."
            : "Bu aralıkta randevu yok. Izgarada boş bir saate tıklayarak oluşturabilirsiniz."}
        </p>
      )}

      <AppointmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        customerOptions={customerOptions}
        listingOptions={listingOptions}
        agentOptions={agentOptions}
        currentAgentId={currentAgentId}
      />
    </div>
  );
}
