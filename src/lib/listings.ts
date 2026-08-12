import type { Listing, ListingCategory, ListingStatus } from "@/types/database";
import { formatCurrency } from "@/lib/format";

/**
 * ============================================================================
 * İLAN MODÜLÜNÜN ARAYÜZ SÖZLÜĞÜ
 * ============================================================================
 * Rozet renkleri, sıralı seçenek listeleri ve saf kurallar. `types/database.ts`
 * yeniden üretilebilir olduğu için bu bilgiler oradan ayrı tutulur.
 *
 * -----------------------------------------------------------------------------
 * FAZ 20: ETİKETLER ARTIK BURADA DEĞİL
 * -----------------------------------------------------------------------------
 * `CATEGORY_LABELS` ve `STATUS_LABELS` diye iki sabit metin haritası vardı
 * ("satilik" → "Satılık"). Çeviriye geçişte kaldırıldılar; metinler
 * `messages/<dil>.json` içinde `listings.category.*` ve `listings.status.*`
 * altında.
 *
 * Bu dosya artık `config/navigation.ts` ile aynı işi yapıyor: YALNIZCA YAPI.
 * Hangi kategoriler var, hangi sırayla listelenecek, hangi rozet tonunu alacak.
 * Metin bir içerik; yapı bir yapılandırma.
 *
 * VERİTABANI DEĞERLERİNE DOKUNULMADI: kolon hâlâ `'satilik'` tutuyor, RLS ve
 * sorgular aynı. Çeviri yalnızca GÖRÜNTÜLEME katmanında.
 */

/* --- Kategori ------------------------------------------------------------ */

/**
 * Menüde ve filtrelerde görünme SIRASI.
 *
 * `Object.keys()` ile türetilmiyor: anahtar sırası bir tesadüf değil, ürün
 * kararı — satılık ve kiralık en sık kullanılanlar, önde duruyorlar.
 */
export const LISTING_CATEGORIES: ListingCategory[] = [
  "satilik",
  "kiralik",
  "arsa",
  "villa",
  "ofis",
];

/** Oda/banyo bilgisi taşımayan kategoriler — form ve kartta gizlenir. */
export const NON_RESIDENTIAL: ListingCategory[] = ["arsa", "ofis"];

export function isResidential(category: ListingCategory) {
  return !NON_RESIDENTIAL.includes(category);
}

/* --- Durum --------------------------------------------------------------- */

export const LISTING_STATUSES: ListingStatus[] = [
  "aktif",
  "pasif",
  "taslak",
  "satildi",
];

/** Badge component'inin variant adlarıyla eşleşir. */
export const STATUS_TONES: Record<
  ListingStatus,
  "success" | "neutral" | "warning" | "brand"
> = {
  aktif: "success",
  pasif: "neutral",
  taslak: "warning",
  satildi: "brand",
};

/* --- Konum --------------------------------------------------------------- */

/**
 * Şehir → ilçe sözlüğü. Supabase'e geçince bir referans tablosundan gelecek.
 *
 * ÇEVRİLMİYOR: "Kadıköy" İngilizce arayüzde de Kadıköy. Yer adları veri,
 * arayüz metni değil — seed'deki ilan başlıklarıyla aynı kategoride.
 */
export const LOCATIONS: Record<string, string[]> = {
  İstanbul: [
    "Sarıyer",
    "Beşiktaş",
    "Kadıköy",
    "Şişli",
    "Bakırköy",
    "Üsküdar",
    "Ataşehir",
    "Maltepe",
    "Zeytinburnu",
    "Eyüpsultan",
    "Beylikdüzü",
    "Pendik",
  ],
  Ankara: ["Çankaya", "Yenimahalle", "Keçiören"],
  İzmir: ["Karşıyaka", "Bornova", "Çeşme"],
};

export const CITY_OPTIONS = Object.keys(LOCATIONS).map((city) => ({
  value: city,
  label: city,
}));

export function districtsOf(city: string | undefined): string[] {
  if (!city) return [];
  return LOCATIONS[city] ?? [];
}

/* --- Oda sayısı ---------------------------------------------------------- */

/**
 * Oda seçenekleri.
 *
 * "1+1", "2+1"… BİÇİMİ ÇEVRİLMİYOR: Türkiye'de yerleşik bir gösterim ve
 * İngilizce arayüzde de aynı ilanı aynı kodla arayan bir danışman kullanıyor.
 * Yalnızca en üst basamağın "ve üzeri" eki çeviriden geliyor
 * (`listings.rooms.andAbove`).
 */
export const ROOM_VALUES = ["1", "2", "3", "4", "5"] as const;

/** En üst basamak — "5+1 ve üzeri" / "5+1 and above". */
export const ROOM_OPEN_ENDED = "5";

/** 3 → "3+1", 0 → "—" */
export function formatRooms(roomCount: number) {
  if (roomCount <= 0) return "—";
  return `${roomCount}+1`;
}

/* --- Fiyat --------------------------------------------------------------- */

/**
 * Kiralık ilanlarda aylık olduğunu belirtir: "₺72.000/ay".
 *
 * SONEK DIŞARIDAN GELİYOR (Faz 20). Fonksiyon senkron ve hem sunucu hem
 * istemciden çağrılıyor; aktif dili kendisi okuyamaz (gerekçe `lib/format.ts`
 * başlığında). Çağıran taraf `t("listings.perMonth")` geçiyor.
 *
 * Sonek verilmezse fiyat SONEKSİZ dönüyor — yanlış dilde bir ek basmaktansa
 * hiç basmamak doğru. Tutar zaten kategori rozetiyle birlikte görünüyor.
 */
export function formatListingPrice(
  listing: Pick<Listing, "price" | "currency" | "category">,
  monthlySuffix?: string,
) {
  const amount = formatCurrency(listing.price, listing.currency);
  if (listing.category !== "kiralik" || !monthlySuffix) return amount;
  return `${amount}${monthlySuffix}`;
}

/* --- Sıralama ------------------------------------------------------------ */

/** Sıralama anahtarları; etiketleri `listings.sort.*` altında. */
export const SORT_KEYS = [
  "newest",
  "price-asc",
  "price-desc",
  "area-desc",
  "views-desc",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

/**
 * `messages` içindeki anahtar adı.
 *
 * Sıralama değerleri tire içeriyor (`price-asc`) ama JSON anahtarları nokta
 * ile bölündüğü için tire sorun değil — yine de okunabilirlik adına sözlükte
 * camelCase duruyorlar ve dönüşüm burada, tek yerde.
 */
export type SortMessageKey =
  | "newest"
  | "priceAsc"
  | "priceDesc"
  | "areaDesc"
  | "viewsDesc";

export const SORT_MESSAGE_KEY: Record<SortKey, SortMessageKey> = {
  newest: "newest",
  "price-asc": "priceAsc",
  "price-desc": "priceDesc",
  "area-desc": "areaDesc",
  "views-desc": "viewsDesc",
};
