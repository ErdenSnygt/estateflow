import type { CustomerStatus } from "@/types/database";
import type { CustomerFilters } from "@/lib/data/customers";
import {
  CUSTOMER_SORT_KEYS,
  CUSTOMER_STATUSES,
  type CustomerSortKey,
} from "@/lib/customers";

/**
 * URL arama parametreleri ↔ `CustomerFilters` çevirisi.
 * `listings-filters.ts` ile birebir aynı desen; ayrıştırıcılar (`single`,
 * `oneOf`, `positiveNumber`) oradan taşındı — iki modül de aynı kurallarla
 * çalışsın diye `search-params.ts` içinde ortaklaştırıldı.
 */
import {
  oneOf,
  positiveNumber,
  single,
  type SearchParamsInput,
} from "@/lib/search-params";

/** Bütçe grup: iki anahtar, tek kullanıcı filtresi. */
export const CUSTOMER_FILTER_KEYS = [
  "q",
  "status",
  "agent",
  ["minBudget", "maxBudget"],
] as const;

export function parseCustomerFilters(
  params: SearchParamsInput,
): CustomerFilters {
  const minBudget = positiveNumber(params, "minBudget");
  const maxBudget = positiveNumber(params, "maxBudget");
  const inverted =
    minBudget !== undefined && maxBudget !== undefined && minBudget > maxBudget;

  return {
    search: single(params, "q"),
    status: oneOf<CustomerStatus>(
      params,
      "status",
      [...CUSTOMER_STATUSES],
    ),
    /* Danışman kimliği artık bir listeye karşı doğrulanmıyor: liste
       veritabanında ve bu fonksiyon senkron. Geçersiz bir kimlik hata
       vermez, yalnızca boş sonuç üretir — `search-params.ts` başlığındaki
       "bozuk parametre filtreyi düşürmez" kuralıyla aynı sonuç. */
    agent: single(params, "agent"),
    minBudget: inverted ? maxBudget : minBudget,
    maxBudget: inverted ? minBudget : maxBudget,
    sort: oneOf<CustomerSortKey>(
      params,
      "sort",
      [...CUSTOMER_SORT_KEYS],
    ),
  };
}

export function countActiveCustomerFilters(params: SearchParamsInput): number {
  /* Bütçe iki anahtarla tutuluyor ama kullanıcı için tek filtre. */
  const budgetActive =
    single(params, "minBudget") !== undefined ||
    single(params, "maxBudget") !== undefined;

  const others = (["q", "status", "agent"] as const).filter(
    (key) => single(params, key) !== undefined,
  ).length;

  return others + (budgetActive ? 1 : 0);
}
