/**
 * ============================================================================
 * ARAMA PARAMETRESİ AYRIŞTIRICILARI
 * ============================================================================
 * Filtre state'i URL'de duruyor; her modülün onu okuma kuralları aynı olmalı.
 * Bu yardımcılar önce `listings-filters.ts` içindeydi, Müşteriler modülü
 * eklenince ortaklaştırıldı — kopyalamak iki farklı davranış üretirdi.
 *
 * Ortak kural: BOZUK PARAMETRE FİLTREYİ DÜŞÜRMEZ. Elle düzenlenmiş ya da
 * eski bir link, hata sayfası yerine yok sayılmış bir filtre üretir.
 */

export type SearchParamsInput = Record<string, string | string[] | undefined>;

/** Aynı anahtar birden çok kez verilirse ilkini alır. */
export function single(
  params: SearchParamsInput,
  key: string,
): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export function positiveNumber(
  params: SearchParamsInput,
  key: string,
): number | undefined {
  const raw = single(params, key);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/** Değer izin verilen kümede değilse yok sayılır. */
export function oneOf<T extends string>(
  params: SearchParamsInput,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const raw = single(params, key);
  return raw && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : undefined;
}

/** Kullanıcı aralığı ters girerse sessizce düzeltir. */
export function swapIfInverted(
  min: number | undefined,
  max: number | undefined,
): [number | undefined, number | undefined] {
  if (min !== undefined && max !== undefined && min > max) return [max, min];
  return [min, max];
}
