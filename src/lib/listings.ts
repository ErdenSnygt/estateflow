import type { Listing, ListingCategory, ListingStatus } from "@/types/database";
import { formatCurrency } from "@/lib/format";

/**
 * İlan modülünün arayüz sözlüğü: etiketler, rozet renkleri, filtre seçenekleri.
 * `types/database.ts` yeniden üretilebilir olduğu için bu bilgiler oradan ayrı
 * tutulur.
 */

/* --- Kategori ------------------------------------------------------------ */

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  satilik: "Satılık",
  kiralik: "Kiralık",
  arsa: "Arsa",
  villa: "Villa",
  ofis: "Ofis",
};

export const CATEGORY_OPTIONS = (
  Object.keys(CATEGORY_LABELS) as ListingCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));

/** Oda/banyo bilgisi taşımayan kategoriler — form ve kartta gizlenir. */
export const NON_RESIDENTIAL: ListingCategory[] = ["arsa", "ofis"];

export function isResidential(category: ListingCategory) {
  return !NON_RESIDENTIAL.includes(category);
}

/* --- Durum --------------------------------------------------------------- */

export const STATUS_LABELS: Record<ListingStatus, string> = {
  aktif: "Aktif",
  pasif: "Pasif",
  taslak: "Taslak",
  satildi: "Satıldı",
};

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

export const STATUS_OPTIONS = (
  Object.keys(STATUS_LABELS) as ListingStatus[]
).map((value) => ({ value, label: STATUS_LABELS[value] }));

/* --- Konum --------------------------------------------------------------- */

/** Şehir → ilçe sözlüğü. Supabase'e geçince bir referans tablosundan gelecek. */
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

export const ROOM_OPTIONS = [
  { value: "1", label: "1+1" },
  { value: "2", label: "2+1" },
  { value: "3", label: "3+1" },
  { value: "4", label: "4+1" },
  { value: "5", label: "5+1 ve üzeri" },
];

/** 3 → "3+1", 0 → "—" */
export function formatRooms(roomCount: number) {
  if (roomCount <= 0) return "—";
  return `${roomCount}+1`;
}

/* --- Fiyat --------------------------------------------------------------- */

/** Kiralık ilanlarda aylık olduğunu belirtir: "₺72.000/ay". */
export function formatListingPrice(
  listing: Pick<Listing, "price" | "currency" | "category">,
) {
  const amount = formatCurrency(listing.price, listing.currency);
  return listing.category === "kiralik" ? `${amount}/ay` : amount;
}

/* --- Sıralama ------------------------------------------------------------ */

export const SORT_OPTIONS = [
  { value: "newest", label: "En yeni" },
  { value: "price-asc", label: "Fiyat (artan)" },
  { value: "price-desc", label: "Fiyat (azalan)" },
  { value: "area-desc", label: "Alan (büyükten)" },
  { value: "views-desc", label: "En çok görüntülenen" },
];

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
