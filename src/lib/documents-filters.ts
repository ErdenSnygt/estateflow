import type { DocumentType } from "@/types/database";
import type { DocumentFilters } from "@/lib/data/documents";
import { DOCUMENT_TYPE_LABELS } from "@/lib/messaging";
import { oneOf, single, type SearchParamsInput } from "@/lib/search-params";
import { sanitizeSearch } from "@/lib/data/query";

/**
 * URL arama parametreleri ↔ evrak filtreleri.
 * `sales-filters.ts` ve `listings-filters.ts` ile aynı desen.
 */

export const DOCUMENT_FILTER_KEYS = ["q", "type", "customer", "listing"] as const;

export function parseDocumentFilters(
  params: SearchParamsInput,
): DocumentFilters {
  const search = single(params, "q");

  return {
    type: oneOf<DocumentType>(
      params,
      "type",
      Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[],
    ),
    customer: single(params, "customer"),
    listing: single(params, "listing"),
    /* `ilike` şablonuna doğrudan giriyor; PostgREST'in ayraç saydığı
       karakterler temizlenmezse sorgu bozulur ve 400 döner. Gerekçe
       `data/query.ts` içinde. */
    search: search ? sanitizeSearch(search) || undefined : undefined,
  };
}

export function countActiveDocumentFilters(params: SearchParamsInput): number {
  return DOCUMENT_FILTER_KEYS.filter(
    (key) => single(params, key) !== undefined,
  ).length;
}
