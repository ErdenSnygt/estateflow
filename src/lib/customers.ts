import type { CustomerEventType, CustomerStatus } from "@/types/database";

/**
 * ============================================================================
 * MÜŞTERİ ARAYÜZ YAPILANDIRMASI
 * ============================================================================
 * `lib/listings.ts` ile aynı desende ve Faz 21'de aynı dönüşümü geçirdi:
 * ETİKETLER BURADAN KALKTI, sözlüğe (`messages/*.json` → `customers.*`)
 * taşındı. Geride yalnızca YAPI kaldı — hangi değerler var, hangi sırayla
 * çiziliyor, hangi rozet tonuyla eşleşiyor.
 *
 * Ayrım şu soruyla veriliyor: "bu bilgi dil değiştirince değişir mi?" Sıra ve
 * ton değişmez, metin değişir.
 */

/* --- Durum (ilgi sıcaklığı) ---------------------------------------------- */

/**
 * Açılırlarda ve filtrelerde bu sırayla çiziliyor.
 *
 * `satisfies`: dizi hem LİTERAL tipini koruyor (`t(\`status.${value}\`)`
 * derlemede denetlensin diye) hem de şemadaki birliğe üye olmayan bir değer
 * yazılırsa hata veriyor.
 */
export const CUSTOMER_STATUSES = [
  "sicak",
  "normal",
  "soguk",
] as const satisfies readonly CustomerStatus[];

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

/* --- Zaman çizelgesi olayları -------------------------------------------- */

/**
 * Çizelgede görünen olay türleri.
 *
 * `created` LİSTEDE AMA SEÇİLEMEZ: kaydı uygulama üretiyor, kullanıcı elle
 * ekleyemiyor. Ayıklama form tarafında (`add-event-form.tsx`) — burada tam
 * liste duruyor çünkü çizelge onu da çiziyor.
 */
export const CUSTOMER_EVENT_TYPES = [
  "created",
  "called",
  "viewed",
  "offer_sent",
  "negotiation",
  "purchased",
  "lost",
] as const satisfies readonly CustomerEventType[];

/* --- Bütçe aralıkları ----------------------------------------------------- */

/**
 * Filtre açılırındaki hazır bantlar.
 *
 * `value` URL'e yazılıyor (`min-max`) ve DEĞİŞMİYOR — paylaşılan bir filtre
 * bağlantısı dil değiştirince bozulmamalı. `key` ise sözlükteki karşılığı;
 * ikisi ayrı çünkü "0-5000000" bir çeviri anahtarı olarak okunmaz.
 */
export const BUDGET_BANDS = [
  { value: "0-5000000", key: "under5" },
  { value: "5000000-10000000", key: "from5to10" },
  { value: "10000000-20000000", key: "from10to20" },
  { value: "20000000-40000000", key: "from20to40" },
  { value: "40000000-0", key: "over40" },
] as const;

export type BudgetBandKey = (typeof BUDGET_BANDS)[number]["key"];

/* --- Sıralama ------------------------------------------------------------- */

export const CUSTOMER_SORT_KEYS = [
  "recent",
  "name",
  "budget-desc",
  "budget-asc",
  "interest-desc",
] as const;

export type CustomerSortKey = (typeof CUSTOMER_SORT_KEYS)[number];

/**
 * Sözlükteki anahtar adı.
 *
 * `lib/listings.ts` içindeki `SORT_MESSAGE_KEY` ile aynı gerekçe: sıralama
 * değerleri tire içeriyor (`budget-desc`) ama sözlükte camelCase duruyorlar
 * ve dönüşüm tek yerde.
 */
export type CustomerSortMessageKey =
  | "recent"
  | "name"
  | "budgetDesc"
  | "budgetAsc"
  | "interestDesc";

export const CUSTOMER_SORT_MESSAGE_KEY: Record<
  CustomerSortKey,
  CustomerSortMessageKey
> = {
  recent: "recent",
  name: "name",
  "budget-desc": "budgetDesc",
  "budget-asc": "budgetAsc",
  "interest-desc": "interestDesc",
};
