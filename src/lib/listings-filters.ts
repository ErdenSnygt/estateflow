import type { ListingCategory, ListingStatus } from "@/types/database";
import type { ListingFilters } from "@/lib/data/listings";
import { CATEGORY_LABELS, SORT_OPTIONS, STATUS_LABELS } from "@/lib/listings";
import type { SortKey } from "@/lib/listings";

/**
 * URL arama parametreleri ile `ListingFilters` arasındaki çeviri.
 * Tek yerde toplanır ki sunucu sayfası ile istemci filtre çubuğu aynı
 * anahtarları kullansın.
 *
 * Ayrıştırıcılar `search-params.ts` içinde ortaktır — Müşteriler modülü de
 * aynılarını kullanıyor.
 */
import {
  oneOf,
  positiveNumber,
  single,
  swapIfInverted,
  type SearchParamsInput,
} from "@/lib/search-params";

export type { SearchParamsInput };

export const FILTER_KEYS = [
  "q",
  "city",
  "district",
  "category",
  "status",
  "minPrice",
  "maxPrice",
  "minArea",
  "maxArea",
  "rooms",
] as const;

/** Sıralama ve görünüm filtre sayılmaz — "temizle" bunlara dokunmaz. */
export const VIEW_KEYS = ["sort", "view"] as const;

export function parseListingFilters(params: SearchParamsInput): ListingFilters {
  const minPrice = positiveNumber(params, "minPrice");
  const maxPrice = positiveNumber(params, "maxPrice");
  const minArea = positiveNumber(params, "minArea");
  const maxArea = positiveNumber(params, "maxArea");

  return {
    search: single(params, "q"),
    city: single(params, "city"),
    district: single(params, "district"),
    category: oneOf<ListingCategory>(
      params,
      "category",
      Object.keys(CATEGORY_LABELS) as ListingCategory[],
    ),
    status: oneOf<ListingStatus>(
      params,
      "status",
      Object.keys(STATUS_LABELS) as ListingStatus[],
    ),
    // Kullanıcı aralığı ters girerse sessizce düzeltiyoruz.
    minPrice: swapIfInverted(minPrice, maxPrice)[0],
    maxPrice: swapIfInverted(minPrice, maxPrice)[1],
    minArea: swapIfInverted(minArea, maxArea)[0],
    maxArea: swapIfInverted(minArea, maxArea)[1],
    rooms: positiveNumber(params, "rooms"),
    sort: oneOf<SortKey>(
      params,
      "sort",
      SORT_OPTIONS.map((option) => option.value),
    ),
  };
}

export function parseViewMode(params: SearchParamsInput): "grid" | "list" {
  return single(params, "view") === "list" ? "list" : "grid";
}

/** Etkin filtre sayısı — sunucu tarafında rozet göstermek için. */
export function countActiveFilters(params: SearchParamsInput): number {
  return FILTER_KEYS.filter((key) => single(params, key) !== undefined).length;
}
