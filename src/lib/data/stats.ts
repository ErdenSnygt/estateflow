/**
 * ============================================================================
 * ORTAK AGGREGATE PARÇALARI
 * ============================================================================
 * KPI kartlarının şekli ve "aya göre say", "yüzde değişim" gibi hesaplar
 * hem İlanlar hem Müşteriler tarafından kullanılıyor: iki modülün ortak
 * parçası ikisinden de bağımsız bir yerde durur.
 *
 * NEDEN HÂLÂ JAVASCRIPT: bu hesaplar SQL tarafına (`date_trunc`,
 * `count(*) filter (where …)`) bir RPC ile inebilir, ama o RPC'nin dönüş tipi
 * elle bakımı gereken ikinci bir sözleşme demek. Veri kümesi 46 ilan ve 64
 * müşteri; trend için çekilen tek kolon (`created_at`) birkaç kilobayt.
 * Tablolar on binlere çıktığında bu fonksiyonlar bir `rpc()` çağrısına
 * dönüşecek — imzaları o zaman da değişmeyecek.
 */

/** Milisaniye cinsinden bir gün. Tarih pencerelerinde tekrar tekrar geçiyor. */
export const DAY = 86_400_000;

export type StatMetric = {
  value: number;
  /** Önceki döneme göre yüzde değişim. Negatif olabilir. */
  delta: number;
  /** Mini sparkline verisi — son 6-8 dönem. */
  trend: number[];
};

/** Payda sıfırsa 0 döner; Infinity kartı bozar. */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Verilen anın içinde bulunduğu takvim ayının başlangıcı (UTC, milisaniye).
 *
 * SAYI DÖNÜYOR, ISO METNİ DEĞİL ve bu bilinçli. Postgres zaman damgalarını
 * `2026-07-01T00:00:00+00:00` biçiminde, `toISOString()` ise
 * `2026-07-01T00:00:00.000Z` biçiminde yazar. İki metin ay başında tam eşitken
 * karakter karşılaştırması `+` (0x2B) < `.` (0x2E) yüzünden yanlış tarafa
 * düşer — ayın ilk saniyesinde kapanan bir satış "geçen ay" sayılırdı.
 * Karşılaştırma her zaman `Date.parse` ile sayıya çevrilerek yapılır.
 *
 * Faz 6'da `data/agents.ts` içinde özel bir yardımcıydı; Faz 8'de satış
 * modülü de aynı sınıra ihtiyaç duyunca buraya taşındı.
 */
export function monthStartUtc(epoch: number): number {
  const reference = new Date(epoch);
  return Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1);
}

/** `[from, to)` aralığına düşen zaman damgası sayısı. */
export function countWithin(
  timestamps: readonly number[],
  from: number,
  to: number,
): number {
  return timestamps.filter((value) => value >= from && value < to).length;
}

/**
 * Son `months` ayın her biri için kayıt sayısı — KPI kartlarının trend
 * çizgisi. Pencere `epoch`'un ayında biter; Faz 5'ten itibaren çağıranlar
 * buraya `Date.now()` geçiriyor (sabit DATA_EPOCH kaldırıldı).
 */
export function countPerMonth(
  timestamps: readonly number[],
  months: number,
  epoch: number,
): number[] {
  const reference = new Date(epoch);

  return Array.from({ length: months }, (_, index) => {
    const monthsAgo = months - 1 - index;
    const start = Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth() - monthsAgo,
      1,
    );
    const end = Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth() - monthsAgo + 1,
      1,
    );
    return countWithin(timestamps, start, end);
  });
}
