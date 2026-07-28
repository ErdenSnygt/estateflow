import type { CustomerEventType, CustomerStatus } from "@/types/database";

/**
 * MÜŞTERİ ARAYÜZ SÖZLÜĞÜ
 *
 * `lib/listings.ts` ile aynı desende: etiketler, rozet tonları ve filtre
 * seçenekleri burada durur; veri katmanı yalnızca ham değeri taşır.
 */

/* --- Durum (ilgi sıcaklığı) ---------------------------------------------- */

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  sicak: "Sıcak",
  normal: "Normal",
  soguk: "Soğuk",
};

/** Badge variant adlarıyla eşleşir. Sıcak için `danger` kullanmıyoruz —
 *  kırmızı "sorun" anlamına geliyor, oysa sıcak müşteri iyi haberdir. */
export const CUSTOMER_STATUS_TONES: Record<
  CustomerStatus,
  "warning" | "brand" | "neutral"
> = {
  sicak: "warning",
  normal: "brand",
  soguk: "neutral",
};

export const CUSTOMER_STATUS_OPTIONS = (
  Object.keys(CUSTOMER_STATUS_LABELS) as CustomerStatus[]
).map((value) => ({ value, label: CUSTOMER_STATUS_LABELS[value] }));

/* --- Zaman çizelgesi olayları -------------------------------------------- */

export const CUSTOMER_EVENT_LABELS: Record<CustomerEventType, string> = {
  created: "Müşteri kaydı oluşturuldu",
  called: "Telefonla görüşüldü",
  viewed: "İlanı yerinde gezdi",
  offer_sent: "Teklif gönderildi",
  negotiation: "Pazarlık görüşmesi yapıldı",
  purchased: "Satın alma tamamlandı",
  lost: "Süreç olumsuz sonuçlandı",
};

/* --- Bütçe aralıkları ----------------------------------------------------- */

/** Filtre açılırındaki hazır bantlar; değer `min-max` biçiminde URL'e yazılır. */
export const BUDGET_OPTIONS = [
  { value: "0-5000000", label: "5 Mn ₺ altı" },
  { value: "5000000-10000000", label: "5 – 10 Mn ₺" },
  { value: "10000000-20000000", label: "10 – 20 Mn ₺" },
  { value: "20000000-40000000", label: "20 – 40 Mn ₺" },
  { value: "40000000-0", label: "40 Mn ₺ üstü" },
] as const;

export const CUSTOMER_SORT_OPTIONS = [
  { value: "recent", label: "Son görüşmeye göre" },
  { value: "name", label: "İsme göre (A-Z)" },
  { value: "budget-desc", label: "Bütçe (yüksekten)" },
  { value: "budget-asc", label: "Bütçe (düşükten)" },
  { value: "interest-desc", label: "İlgilendiği ilan sayısı" },
] as const;

export type CustomerSortKey = (typeof CUSTOMER_SORT_OPTIONS)[number]["value"];
