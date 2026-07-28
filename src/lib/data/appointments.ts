import type { AppointmentStatus, AppointmentType } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { maybeRow, rows } from "@/lib/data/query";
import { rangeToIso, toDateKey, toIso, type DateKey } from "@/lib/calendar";

/**
 * ============================================================================
 * RANDEVU VERİ ERİŞİMİ
 * ============================================================================
 * Takvim TEK BİR SORGUYLA çiziliyor: görünüm hangi aralığı kapsıyorsa (gün,
 * hafta ya da ay ızgarasının tamamı) o aralıktaki randevular bir kerede
 * alınıyor. Gün gün sorgulamak 7–42 ağ turu demekti; aralık sorgusu bir tur.
 *
 * RLS burada da görünmez ama etkili: danışman yalnızca kendi randevularını
 * görür (`appointments.agent_id`), yönetici hepsini. Sorgu aynı, politika
 * farklı — `data/sales.ts` ile aynı durum.
 *
 * Aralık sınırı: BAŞLANGICI aralığa düşen randevular. Gece yarısını aşan bir
 * randevu (nadir ama mümkün) başladığı güne çizilir; ızgara da onu gün
 * sonunda kırpar.
 */

/** Takvimin bir randevu için ihtiyaç duyduğu her şey. */
export type AppointmentItem = {
  id: string;
  title: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  customer: { id: string; full_name: string; phone: string } | null;
  listing: { id: string; title: string; district: string; city: string } | null;
  agent: { id: string; full_name: string; initials: string } | null;
};

export type AppointmentFilters = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  agent?: string;
};

const APPOINTMENT_SELECT = `
  id, title, appointment_type, status, start_time, end_time, location, notes,
  customer:customers(id, full_name, phone),
  listing:listings(id, title, district, city),
  agent:agents(id, full_name, initials)
`;

/**
 * Bir tarih aralığındaki randevular.
 *
 * Aralık GÜN ANAHTARLARIYLA veriliyor (`"2026-07-28"`), ISO'ya çevrimi
 * `lib/calendar.ts` yapıyor — "gün nerede başlar" kararı tek yerde kalsın.
 */
export async function getAppointments(
  range: { start: DateKey; end: DateKey },
  filters: AppointmentFilters = {},
): Promise<AppointmentItem[]> {
  const supabase = await createClient();
  const { from, to } = rangeToIso(range);

  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("start_time", from)
    .lt("start_time", to);

  if (filters.type) query = query.eq("appointment_type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.agent) query = query.eq("agent_id", filters.agent);

  /* Sıralama ızgara için şart değil (yerleşim istemcide hesaplanıyor) ama
     ajanda görünümü ve mobil liste doğrudan bu sırayı kullanıyor. */
  return rows<AppointmentItem>(
    await query.order("start_time", { ascending: true }),
    "Randevu listesi",
  );
}

export async function getAppointmentById(
  id: string,
): Promise<AppointmentItem | null> {
  const supabase = await createClient();

  return maybeRow<AppointmentItem>(
    await supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("id", id)
      .maybeSingle(),
    "Randevu",
  );
}

/* ==========================================================================
   Diğer sayfalardaki mini listeler
   ========================================================================== */

/**
 * Müşteri detayındaki "Yaklaşan Randevular".
 *
 * İPTAL EDİLENLER LİSTEDE YOK ama tamamlananlar da yok: "yaklaşan" sözü
 * gelecekteki planı anlatıyor. Geçmiş randevular müşterinin görüşme
 * geçmişinde zaten duruyor — tamamlandığında çizelgeye bir olay düşüyor.
 */
export async function getUpcomingAppointmentsForCustomer(
  customerId: string,
  limit = 4,
  now: number = Date.now(),
): Promise<AppointmentItem[]> {
  const supabase = await createClient();

  return rows<AppointmentItem>(
    await supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("customer_id", customerId)
      .eq("status", "planlandi")
      .gte("start_time", new Date(now).toISOString())
      .order("start_time", { ascending: true })
      .limit(limit),
    "Müşteri randevuları",
  );
}

/**
 * İlan detayındaki randevu listesi.
 *
 * Burada durum filtresi YOK: bir ilana kaç kez gezme yapıldığı, kaçının iptal
 * olduğu ilanın hikâyesinin parçası. Sıralama da tersine — en yenisi üstte.
 */
export async function getAppointmentsForListing(
  listingId: string,
  limit = 5,
): Promise<AppointmentItem[]> {
  const supabase = await createClient();

  return rows<AppointmentItem>(
    await supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("listing_id", listingId)
      .order("start_time", { ascending: false })
      .limit(limit),
    "İlan randevuları",
  );
}

/**
 * Dashboard'daki "Bugünkü Randevular".
 *
 * Gün sınırı ofis takvimine göre (`toDateKey`), sunucunun saat dilimine göre
 * değil — gerekçe `lib/calendar.ts` başlığında.
 */
export async function getTodayAppointments(
  now: number = Date.now(),
): Promise<AppointmentItem[]> {
  const supabase = await createClient();
  const today = toDateKey(now);

  return rows<AppointmentItem>(
    await supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .gte("start_time", toIso(today, 0))
      .lt("start_time", toIso(today, 1440))
      .neq("status", "iptal")
      .order("start_time", { ascending: true }),
    "Bugünkü randevular",
  );
}

/* ==========================================================================
   Form seçenekleri
   ========================================================================== */

export type CustomerOption = { id: string; label: string; hint?: string };

/**
 * Randevu formundaki müşteri ve ilan açılırları.
 *
 * `getCustomers()` / `getListings()` çağrılmıyor: o fonksiyonlar kart çizmek
 * için tasarlanmış geniş satırlar döndürüyor (ilgi sayımları, görseller,
 * bütçe…) ve açılır listeye yalnızca iki alan giriyor. Aynı sorguyu dar
 * tutmak, form açılırken taşınan gövdeyi belirgin biçimde küçültüyor.
 *
 * RLS ikisini de kendiliğinden daraltıyor — danışman yalnızca kendi
 * müşterisini ve kendi portföyünü seçebiliyor.
 */
export async function getAppointmentFormOptions(): Promise<{
  customers: CustomerOption[];
  listings: CustomerOption[];
}> {
  const supabase = await createClient();

  const [customerRows, listingRows] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, phone")
      .order("full_name", { ascending: true }),
    supabase
      .from("listings")
      .select("id, title, district")
      .neq("status", "satildi")
      .order("created_at", { ascending: false }),
  ]);

  return {
    customers: rows<{ id: string; full_name: string; phone: string }>(
      customerRows,
      "Randevu formu müşterileri",
    ).map((customer) => ({
      id: customer.id,
      label: customer.full_name,
      hint: customer.phone || undefined,
    })),
    listings: rows<{ id: string; title: string; district: string }>(
      listingRows,
      "Randevu formu ilanları",
    ).map((listing) => ({
      id: listing.id,
      label: listing.title,
      hint: listing.district || undefined,
    })),
  };
}
