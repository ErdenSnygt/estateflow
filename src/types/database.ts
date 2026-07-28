/**
 * ============================================================================
 * UYGULAMA TİPLERİ
 * ============================================================================
 * Faz 6'ya kadar bu dosya şemayı elle tekrar ediyordu ve başında "şema
 * durulunca `supabase gen types typescript` çıktısıyla değiştirilecek" notu
 * duruyordu. O adım atıldı: kolon listeleri artık `types/supabase.ts` içinde,
 * bu dosya yalnızca ONLARA İSİM VERİYOR.
 *
 * Neden hâlâ bir ara katman var:
 *
 *  1. `Tables<"listings">` bir sorgu sonucunu okurken anlaşılır değil; arayüz
 *     kodunun `Listing` demeye devam etmesi gerekiyor.
 *  2. Insert tipleri sunucunun ürettiği alanları (id, sayaçlar, zaman damgası)
 *     dışarıda bırakmalı — üretilen `TablesInsert` onları "isteğe bağlı" yapar,
 *     yani istemciden gelen bir gövde `views_count: 9999` taşıyabilirdi.
 *  3. Bazı sorgular PostgREST takma adlarıyla kolonları yeniden adlandırıyor
 *     (`type:event_type`); o şekiller şemada yok, burada tanımlı.
 *
 * Alan adları snake_case: Postgres kolon adlarıyla aynı kalsın ki sorgu
 * sonuçları dönüştürme katmanı olmadan doğrudan kullanılabilsin.
 *
 * Etiketler, rozet renkleri ve filtre seçenekleri için `src/lib/listings.ts`,
 * `src/lib/customers.ts` ve `src/lib/agents.ts` dosyalarına bakın.
 */

import type { Tables, TablesInsert } from "@/types/supabase";

export type { Database } from "@/types/supabase";

export type {
  ActivityEventType,
  AgentRole,
  AppointmentStatus,
  AppointmentType,
  Currency,
  CustomerEventType,
  CustomerStatus,
  InterestIntent,
  ListingCategory,
  ListingStatus,
  OfferStatus,
} from "@/types/supabase";

/* ==========================================================================
   İlanlar
   ========================================================================== */

export type Listing = Tables<"listings">;

/**
 * Yeni kayıt: sunucunun ürettiği alanlar hariç.
 *
 * `published_at` isteğe bağlı çünkü formda böyle bir alan yok — durum "taslak"
 * değilse server action onu kendisi damgalar (`actions/listings.ts`).
 * Koordinatlar da isteğe bağlı: formda harita seçici yok.
 */
export type ListingInsert = Omit<
  TablesInsert<"listings">,
  "id" | "views_count" | "favorites_count" | "created_at" | "updated_at"
>;

export type ListingUpdate = Partial<ListingInsert>;

/* ==========================================================================
   Müşteriler
   ========================================================================== */

export type Customer = Tables<"customers">;

export type CustomerInsert = Omit<
  TablesInsert<"customers">,
  "id" | "created_at" | "updated_at"
>;

export type CustomerUpdate = Partial<CustomerInsert>;

/**
 * Müşteri ↔ İlan çoka-çok ilişkisi.
 *
 * `intent` alanı Faz 4'te yoktu ve kiralık ilanlar hiçbir müşteriyle
 * eşleşemiyordu: `budget_min/max` bir SATIN ALMA bütçesi, aylık kira ise
 * bambaşka bir büyüklük. Niyet ilişkinin kendisinde durunca ilan detayındaki
 * "İlgilenen Müşteriler" kartı kiralıklarda da doğru çalışıyor.
 */
export type CustomerInterest = Tables<"customer_listing_interests">;

/**
 * Müşteri zaman çizelgesi kaydı — ARAYÜZ ŞEKLİ.
 *
 * Tabloda kolonlar `event_type` / `description` / `occurred_at`; sorgu onları
 * PostgREST takma adlarıyla aşağıdaki adlara çeviriyor. Bu yüzden tip şemadan
 * türetilemiyor, elle duruyor. Ham satır için `Tables<"customer_timeline_events">`.
 */
export type CustomerEvent = {
  id: string;
  customer_id: string;
  type: Tables<"customer_timeline_events">["event_type"];
  /** İlgili ilan — her olayda olmayabilir (ör. kayıt oluşturuldu). */
  listing_id: string | null;
  note: string;
  created_at: string;
};

/* ==========================================================================
   Personel
   ========================================================================== */

/**
 * Danışman / personel kaydı.
 *
 * İKİ AYRI "ROL" ALANI VAR, karıştırılmamalı:
 *  · `title` — görünen unvan ("Kıdemli Portföy Danışmanı"). Serbest metin,
 *    yalnızca gösterim. Faz 5'e kadar `role` adını taşıyordu.
 *  · `role`  — yetkilendirme rolü ("patron" | "ofis_muduru" | "danisman").
 *    RLS politikalarının okuduğu alan; arayüzde rozet olarak gösterilir.
 */
export type Agent = Tables<"agents">;

/** Kapanan işlem. Dashboard'ın 12 aylık satış serisi bu tablodan gelir. */
export type Sale = Tables<"sales">;

/** Teklif. "Bekleyen Teklif" KPI'ı `status = 'pending'` sayımıdır. */
export type Offer = Tables<"offers">;

/** Dashboard aktivite akışı. */
export type ActivityLogEntry = Tables<"activity_log">;

/* ==========================================================================
   Randevular
   ========================================================================== */

/**
 * Takvim kaydı.
 *
 * `start_time` / `end_time` ISO metin (timestamptz). Izgaraya çevrim
 * `src/lib/calendar.ts` içinde ve SABİT UTC+3 üzerinden yapılıyor — gerekçe
 * o dosyanın başlığında.
 */
export type Appointment = Tables<"appointments">;

/**
 * Yeni randevu.
 *
 * `reminder_sent` dışarıda: hatırlatma altyapısı yok, kolonu yazan tek şey
 * veritabanının varsayılanı (`false`). Formdan gelen bir gövdenin onu
 * `true` yapabilmesi, olmayan bir bildirimi "gönderildi" saymak olurdu.
 */
export type AppointmentInsert = Omit<
  TablesInsert<"appointments">,
  "id" | "reminder_sent" | "created_at" | "updated_at"
>;

export type AppointmentUpdate = Partial<AppointmentInsert>;
