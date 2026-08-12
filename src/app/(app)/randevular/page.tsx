import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  getAppointmentFormOptions,
  getAppointments,
} from "@/lib/data/appointments";
import { getAgentOptions } from "@/lib/data/agents";
import { getCurrentAgent } from "@/lib/auth/server";
import { canViewStaff } from "@/lib/agents";
import {
  countActiveAppointmentFilters,
  parseAppointmentFilters,
  parseCalendarDate,
  parseCalendarView,
} from "@/lib/appointments-filters";
import { toDateKey, viewRange } from "@/lib/calendar";
import { isMobileRequest } from "@/lib/device";
import type { SearchParamsInput } from "@/lib/search-params";
import { PageHeader } from "@/components/page-header";
import { CalendarWorkspace } from "@/components/appointments/calendar-workspace";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("appointments.page");
  return { title: t("title") };
}

type PageProps = { searchParams: Promise<SearchParamsInput> };

/**
 * Takvim.
 *
 * VARSAYILAN GÖRÜNÜM CİHAZA GÖRE: mobilde günlük, masaüstünde haftalık. Karar
 * sunucuda, istek başlıklarından veriliyor — gerekçe `lib/device.ts`. URL'de
 * `view` varsa o kazanıyor; kullanıcı bir kez sekmeye dokunduktan sonra tahmin
 * devreden çıkıyor.
 *
 * VERİ HER ZAMAN AY IZGARASININ TAMAMI. Görünüm hangisi olursa olsun aynı
 * aralık çekiliyor; böylece sekme değiştirmek sunucuya gitmiyor (gerekçe
 * `calendar-workspace.tsx`).
 */
export default async function RandevularPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const isMobile = await isMobileRequest();
  const view = parseCalendarView(params, isMobile ? "gun" : "hafta");
  const date = parseCalendarDate(params);
  const filters = parseAppointmentFilters(params);

  /* Dördü de paralel — `SatislarPage` ile aynı gerekçe: rolü öğrenmek takvimi
     beklettirmemeli. Danışman için RLS listeyi zaten daraltıyor. */
  const [currentAgent, appointments, formOptions, agents, t] =
    await Promise.all([
      getCurrentAgent(),
      getAppointments(viewRange("ay", date), filters),
      getAppointmentFormOptions(),
      getAgentOptions(),
      getTranslations("appointments.page"),
    ]);

  /* Danışman filtresi yalnızca yöneticiye; danışman zaten yalnızca kendi
     takvimini görüyor ve tek seçenekli bir açılır işe yaramazdı. */
  const agentOptions = canViewStaff(currentAgent?.role) ? agents : [];

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <CalendarWorkspace
        view={view}
        date={date}
        todayKey={toDateKey(Date.now())}
        appointments={appointments}
        customerOptions={formOptions.customers}
        listingOptions={formOptions.listings}
        agentOptions={agentOptions}
        currentAgentId={currentAgent?.id ?? null}
        hasFilters={countActiveAppointmentFilters(params) > 0}
      />
    </div>
  );
}
