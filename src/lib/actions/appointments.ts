"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import type { AppointmentStatus, AppointmentType } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import { isManagerRole } from "@/lib/agents";
import {
  appointmentTitle,
  canTransition,
  timelineDescription,
  timelineEventFor,
} from "@/lib/appointments";
import { notify } from "@/lib/actions/notify";
import {
  fail,
  ok,
  resolveActionError,
  toMessage,
  type ActionErrorKey,
  type ActionResult,
} from "@/lib/actions/result";
import { denyIfReadOnly } from "@/lib/actions/guard";

/**
 * ============================================================================
 * RANDEVU YAZMA İŞLEMLERİ
 * ============================================================================
 * Zincirin başındaki halka: RANDEVU → ilgi → teklif → satış. Faz 11'e kadar
 * müşteri çizelgesindeki "İlanı yerinde gezdi" satırları elle giriliyordu;
 * artık tamamlanan bir randevu onu kendisi yazıyor.
 *
 * -----------------------------------------------------------------------------
 * DANIŞMAN ATAMASI
 * -----------------------------------------------------------------------------
 * Faz 6'daki form kuralıyla aynı: randevu, onu oluşturan danışmanın üzerine
 * yazılır ve danışman bunu değiştiremez. Yönetici başka bir danışmanın
 * takvimine randevu koyabilir — ekibin programını düzenlemek yöneticinin işi.
 * Karar SUNUCUDA veriliyor; istemciden gelen `agentId` yalnızca yönetici için
 * dikkate alınıyor, danışman için sessizce yok sayılıyor.
 *
 * `agent_id` aynı zamanda RLS kapsamı: `with check` yanlış bir sahiple yazmayı
 * zaten reddederdi, buradaki kural arayüzün de aynı şeyi söylemesi için.
 */

function revalidateCalendar(customerId?: string | null, listingId?: string | null) {
  revalidatePath("/randevular");
  revalidatePath("/dashboard");
  if (customerId) revalidatePath(`/musteriler/${customerId}`);
  if (listingId) revalidatePath(`/ilanlar/${listingId}`);
}

/** Randevu sahibini belirler; yalnızca yönetici başkasını seçebilir. */
async function resolveAgentId(
  requested: string | undefined,
): Promise<
  { ok: true; agentId: string } | { ok: false; error: ActionErrorKey }
> {
  const agent = await getCurrentAgent();

  if (!agent) {
    return {
      ok: false,
      error: "appointmentAgentNotFound",
    };
  }
  if (!agent.is_active) {
    return { ok: false, error: "accountInactive" };
  }

  if (requested && requested !== agent.id && !isManagerRole(agent.role)) {
    return {
      ok: false,
      error: "appointmentOtherAgent",
    };
  }

  return { ok: true, agentId: requested || agent.id };
}

/** Ortak zaman doğrulaması — form da sürükle-bırak da buradan geçiyor. */
function checkTimes(startIso: string, endIso: string): ActionErrorKey | null {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "appointmentDateUnreadable";
  }
  if (end <= start) {
    return "appointmentEndBeforeStart";
  }
  return null;
}

/* ==========================================================================
   Oluşturma
   ========================================================================== */

export type CreateAppointmentInput = {
  title: string;
  type: AppointmentType;
  customerId: string;
  listingId?: string | null;
  agentId?: string;
  startIso: string;
  endIso: string;
  location?: string;
  notes?: string;
};

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<ActionResult<{ id: string }>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const timeError = checkTimes(input.startIso, input.endIso);
  if (timeError) return fail(timeError);

  if (!input.customerId) return fail("appointmentCustomerRequired");

  const owner = await resolveAgentId(input.agentId);
  if (!owner.ok) return fail(owner.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      title: appointmentTitle(input.title, input.type),
      appointment_type: input.type,
      customer_id: input.customerId,
      listing_id: input.listingId || null,
      agent_id: owner.agentId,
      start_time: input.startIso,
      end_time: input.endIso,
      location: input.location?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      status: "planlandi",
    })
    .select("id")
    .single();

  if (error) return fail(toMessage(error));

  /* Aktivite akışında `appointment_scheduled` olay tipi Faz 5'ten beri şemada
     duruyordu ve onu yazan hiçbir kod yoktu — dashboard akışı randevulardan
     hiç haberdar olmuyordu. */
  await supabase.from("activity_log").insert({
    event_type: "appointment_scheduled",
    description: appointmentTitle(input.title, input.type),
    actor_agent_id: owner.agentId,
    related_listing_id: input.listingId || null,
    related_customer_id: input.customerId,
  });

  /* Randevu bildirimi — takvimin sahibine.
     HATIRLATMA DEĞİL, "planlandı" bildirimi. Gerçek hatırlatma ("randevunuza
     1 saat kaldı") zamanlanmış bir iş gerektiriyor: uygulamada cron ya da
     arka plan kuyruğu yok, o yüzden bilerek kapsam dışı. Buradaki bildirim
     yalnızca "senin takvimine biri randevu koydu" diyor ve bu ancak
     BAŞKASI koyduğunda anlamlı — kendi randevusunu açan danışman bildirim
     almıyor. */
  await notify(supabase, {
    agentId: owner.agentId,
    actorAgentId: (await getCurrentAgent())?.id,
    type: "appointment_scheduled",
    title: "Takviminize randevu eklendi",
    description: appointmentTitle(input.title, input.type),
    entityType: "appointment",
    entityId: data.id,
  });

  revalidateCalendar(input.customerId, input.listingId);
  return ok({ id: data.id });
}

/* ==========================================================================
   Güncelleme
   ========================================================================== */

export type UpdateAppointmentInput = {
  title?: string;
  type?: AppointmentType;
  customerId?: string;
  listingId?: string | null;
  startIso?: string;
  endIso?: string;
  location?: string;
  notes?: string;
};

/**
 * Randevu düzenleme — FORM DA SÜRÜKLE-BIRAK DA BURAYA GELİR.
 *
 * Sürükleme yalnızca `startIso` + `endIso` gönderir, form hepsini; ikisi için
 * ayrı action yazmak aynı doğrulamayı iki kez yazmak olurdu. Gönderilmeyen
 * alanlara dokunulmuyor.
 *
 * `agent_id` BU YOLDAN DEĞİŞMİYOR. Bir randevuyu başka bir danışmana devretmek
 * ayrı bir karar (ve prim/sorumluluk anlamı taşıyor); sürükle-bırak sırasında
 * kazara olmasını istemeyiz.
 */
export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput,
): Promise<ActionResult<{ id: string }>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("appointments")
    .select("id, title, appointment_type, status, start_time, end_time, customer_id, listing_id")
    .eq("id", id)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!current) return fail("appointmentNotFound");

  const startIso = input.startIso ?? current.start_time;
  const endIso = input.endIso ?? current.end_time;

  const timeError = checkTimes(startIso, endIso);
  if (timeError) return fail(timeError);

  const type = input.type ?? current.appointment_type;

  const { error } = await supabase
    .from("appointments")
    .update({
      title: appointmentTitle(input.title ?? current.title, type),
      appointment_type: type,
      ...(input.customerId !== undefined ? { customer_id: input.customerId } : {}),
      ...(input.listingId !== undefined
        ? { listing_id: input.listingId || null }
        : {}),
      start_time: startIso,
      end_time: endIso,
      ...(input.location !== undefined ? { location: input.location.trim() } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
    })
    .eq("id", id);

  if (error) return fail(toMessage(error));

  revalidateCalendar(
    input.customerId ?? current.customer_id,
    input.listingId ?? current.listing_id,
  );
  return ok({ id });
}

/* ==========================================================================
   Durum değişikliği — ÇİZELGE ENTEGRASYONUNUN TETİKLENDİĞİ YER
   ========================================================================== */

/**
 * Randevu durumunu değiştirir; "tamamlandı" işaretlendiğinde müşteri
 * çizelgesine otomatik bir olay düşer.
 *
 * -----------------------------------------------------------------------------
 * NEDEN VERİTABANI TETİKLEYİCİSİ (trigger) DEĞİL
 * -----------------------------------------------------------------------------
 * Postgres tarafında bir `after update` tetikleyicisi de aynı satırı yazabilirdi
 * ama projede yan etkiler baştan beri SERVER ACTION İÇİNDE duruyor: teklif
 * kabulü satışı orada açıyor, ilan silme depoyu orada temizliyor. Kuralın tek
 * yerde olması, "bu satır nereden geldi" sorusunun cevabının da tek yerde
 * olması demek. Ayrıca tetikleyici `revalidatePath` çağıramaz — çizelge
 * güncellenir, ekran güncellenmezdi.
 *
 * ÇİFT YAZMAYA KARŞI KAPI: güncelleme koşuluna mevcut durum ekli. Randevu iki
 * sekmede birden tamamlandı işaretlenirse ikinci istek hiçbir satır
 * güncelleyemez ve çizelgeye ikinci bir "ev gezildi" satırı düşmez.
 * `actions/offers.ts` içindeki teklif kabulüyle aynı desen.
 */
export async function setAppointmentStatus(
  id: string,
  next: AppointmentStatus,
): Promise<ActionResult<{ id: string; timelineAdded: boolean }>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const supabase = await createClient();

  const { data: appointment, error: readError } = await supabase
    .from("appointments")
    .select(
      "id, title, appointment_type, status, start_time, location, customer_id, listing_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!appointment) return fail("appointmentNotFound");

  const check = canTransition(appointment.status, next);
  if (!check.ok) {
    /* Durum ETİKETLERİ buradan geliyor, `lib/appointments.ts`ten değil: o
       modül saf ve senkron, çeviri ise asenkron. Saf katman anahtar + durum
       DEĞERİ taşıyor, action onu etikete çeviriyor. */
    const tStatus = await getTranslations("appointments.status");
    return fail(
      check.error,
      Object.fromEntries(
        Object.entries(check.params).map(([name, status]) => [
          name,
          tStatus(status),
        ]),
      ),
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("appointments")
    .update({ status: next })
    .eq("id", id)
    .eq("status", appointment.status)
    .select("id");

  if (updateError) return fail(toMessage(updateError));
  if (!updated || updated.length === 0) {
    return fail("appointmentStatusChanged");
  }

  /* Çizelge olayı YALNIZCA "tamamlandı"da ve yalnızca müşterisi olan
     randevularda. İptal edilen randevu bir görüşme değildir; geri alma
     (tamamlandı → planlandı) da çizelgeden satır SİLMİYOR — geçmişi geriye
     dönük düzeltmek, kullanıcının açıkça istemesi gereken ayrı bir iş. */
  if (next !== "tamamlandi" || !appointment.customer_id) {
    revalidateCalendar(appointment.customer_id, appointment.listing_id);
    return ok({ id, timelineAdded: false });
  }

  let listingTitle: string | null = null;
  if (appointment.listing_id) {
    const { data: listing } = await supabase
      .from("listings")
      .select("title")
      .eq("id", appointment.listing_id)
      .maybeSingle();
    listingTitle = listing?.title ?? null;
  }

  /* `occurred_at` randevunun BAŞLANGIÇ SAATİ, `now()` değil: görüşme o an
     gerçekleşti, kaydın yazıldığı an değil. `actions/timeline.ts` bu ayrımı
     "geçmişe dönük kayıt için tarih seçici gerekir" diye açık bırakmıştı —
     randevuda tarih zaten elimizde. */
  const { error: eventError } = await supabase
    .from("customer_timeline_events")
    .insert({
      customer_id: appointment.customer_id,
      event_type: timelineEventFor(appointment.appointment_type),
      description: timelineDescription({
        title: appointment.title,
        type: appointment.appointment_type,
        listingTitle,
        location: appointment.location,
      }),
      listing_id: appointment.listing_id,
      occurred_at: appointment.start_time,
    });

  if (eventError) {
    /* İç hata da çevrilerek gömülüyor: `toMessage` bir anahtar ya da ham
       Supabase metni döndürüyor, `resolveActionError` ikisini de çözüyor. */
    return fail("appointmentTimelineFailed", {
      reason: await resolveActionError(toMessage(eventError)),
    });
  }

  /* Görüşme yapıldı — müşteri listesindeki "son görüşme" sütunu ve varsayılan
     sıralama bu alandan besleniyor (`actions/timeline.ts` ile aynı kural). */
  await supabase
    .from("customers")
    .update({ last_contact_at: appointment.start_time })
    .eq("id", appointment.customer_id);

  revalidateCalendar(appointment.customer_id, appointment.listing_id);
  revalidatePath("/musteriler");
  return ok({ id, timelineAdded: true });
}

/* ==========================================================================
   Silme
   ========================================================================== */

/**
 * Randevu silme.
 *
 * İPTAL İLE AYNI ŞEY DEĞİL ve arayüz ikisini birden sunuyor: iptal edilen
 * randevu takvimde soluk da olsa durur ("bu saatte bir plan vardı, düştü"),
 * silinen randevu hiç olmamış sayılır. Yanlışlıkla açılmış bir kayıt için
 * ikincisi doğru; gerçekleşmemiş bir plan için birincisi.
 */
export async function deleteAppointment(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const denied = await denyIfReadOnly();
  if (denied) return denied;
  const supabase = await createClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("customer_id, listing_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return fail(toMessage(error));

  revalidateCalendar(appointment?.customer_id, appointment?.listing_id);
  return ok({ id });
}
