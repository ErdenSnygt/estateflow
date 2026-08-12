import type { OfferStatus } from "@/types/database";
import type { OfferFilters, SaleFilters } from "@/lib/data/sales";
import {
  OFFER_SORT_KEYS,
  OFFER_STATUSES,
  SALE_SORT_KEYS,
  type OfferSortKey,
  type SaleSortKey,
} from "@/lib/offers";
import { oneOf, single, type SearchParamsInput } from "@/lib/search-params";

/**
 * URL arama parametreleri ↔ satış/teklif filtreleri.
 * `listings-filters.ts` ve `customers-filters.ts` ile aynı desen; ortak
 * ayrıştırıcılar `search-params.ts` içinde.
 */

export const SALE_FILTER_KEYS = ["agent", ["from", "to"]] as const;
export const OFFER_FILTER_KEYS = ["status", "agent"] as const;

/** `yyyy-mm-dd` — `<input type="date">` bu biçimde üretir ve okur. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(
  params: SearchParamsInput,
  key: string,
): string | undefined {
  const raw = single(params, key);
  if (!raw || !ISO_DATE.test(raw)) return undefined;

  /* Biçim doğru ama tarih gerçek mi? İki ayrı bozukluk var ve ikisi de
     buradan geçiyordu:
       · `2026-13-01` → Invalid Date. `toISOString()` bunun üzerinde
         RangeError FIRLATIR; önce geçerlilik kontrol edilmezse elle
         düzenlenmiş bir link satış sayfasını hata ekranına düşürürdü.
       · `2026-02-31` → bazı ortamlarda sessizce 3 Mart'a kayar; geri
         çevirip karşılaştırmak onu yakalıyor. */
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return parsed.toISOString().slice(0, 10) === raw ? raw : undefined;
}

export function parseSaleFilters(params: SearchParamsInput): SaleFilters {
  const from = isoDate(params, "from");
  const to = isoDate(params, "to");
  /* Kullanıcı aralığı ters girerse sessizce düzeltilir — `search-params.ts`
     içindeki `swapIfInverted` ile aynı kural, burada metin üzerinde. */
  const inverted = from !== undefined && to !== undefined && from > to;

  return {
    agent: single(params, "agent"),
    from: inverted ? to : from,
    to: inverted ? from : to,
    sort: oneOf<SaleSortKey>(
      params,
      "sort",
      [...SALE_SORT_KEYS],
    ),
  };
}

export function countActiveSaleFilters(params: SearchParamsInput): number {
  const rangeActive =
    isoDate(params, "from") !== undefined || isoDate(params, "to") !== undefined;
  const agentActive = single(params, "agent") !== undefined;
  return (rangeActive ? 1 : 0) + (agentActive ? 1 : 0);
}

export function parseOfferFilters(params: SearchParamsInput): OfferFilters {
  return {
    status: oneOf<OfferStatus>(
      params,
      "status",
      [...OFFER_STATUSES],
    ),
    agent: single(params, "agent"),
    sort: oneOf<OfferSortKey>(
      params,
      "sort",
      [...OFFER_SORT_KEYS],
    ),
  };
}

export function countActiveOfferFilters(params: SearchParamsInput): number {
  return (["status", "agent"] as const).filter(
    (key) => single(params, key) !== undefined,
  ).length;
}
