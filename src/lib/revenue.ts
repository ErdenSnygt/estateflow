import type { CommissionStatus } from "@/types/database";

/**
 * ============================================================================
 * GELİR ARAYÜZ SÖZLÜĞÜ VE KOMİSYON HESABI
 * ============================================================================
 * `lib/offers.ts` ile aynı desende: etiketler, tonlar ve saf hesap burada.
 *
 * -----------------------------------------------------------------------------
 * GELİRLER ≠ SATIŞLAR
 * -----------------------------------------------------------------------------
 * İki modül aynı `sales` tablosunu okuyor ama farklı soru soruyor:
 *
 *   Satışlar → "hangi işlemler kapandı"    — olay listesi, tutar müşterinin
 *                                             ödediği bedel
 *   Gelirler → "komisyonum tahsil edildi mi" — para akışı, tutar ofisin
 *                                             kazandığı pay
 *
 * Aynı satır iki farklı büyüklük taşıyor: `amount` (satış bedeli) ve ondan
 * türeyen komisyon. Bu dosya ikinci büyüklüğü hesaplıyor.
 */

/* ==========================================================================
   Tahsilat durumu
   ========================================================================== */

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: "Bekliyor",
  collected: "Tahsil edildi",
  overdue: "Gecikti",
};

export const COMMISSION_STATUS_TONES: Record<
  CommissionStatus,
  "warning" | "success" | "danger"
> = {
  pending: "warning",
  collected: "success",
  /* Gecikme burada gerçekten `danger`: teklifin reddi gibi sıradan bir iş
     akışı olayı değil, takip edilmesi gereken bir aksaklık. */
  overdue: "danger",
};

export const COMMISSION_STATUS_OPTIONS = (
  Object.keys(COMMISSION_STATUS_LABELS) as CommissionStatus[]
).map((value) => ({ value, label: COMMISSION_STATUS_LABELS[value] }));

/**
 * Durum geçişleri.
 *
 * `overdue` ELLE İŞARETLENİYOR, tarihten türetilmiyor. Otomatik gecikme
 * hesabı bir vade tarihi kolonu ister ("komisyon kapanıştan 30 gün sonra
 * ödenir" gibi) ve o vade sözleşmeden sözleşmeye değişiyor. Uydurma bir
 * sabit yerine kararı yöneticiye bırakmak dürüst.
 *
 * Tahsil edilmiş bir komisyon geri alınabiliyor: yanlış işaretleme olur ve
 * teklif kabulünün aksine arkasında bir zincir yok.
 */
const TRANSITIONS: Record<CommissionStatus, readonly CommissionStatus[]> = {
  pending: ["collected", "overdue"],
  overdue: ["collected", "pending"],
  collected: ["pending"],
};

export function canTransitionCommission(
  from: CommissionStatus,
  to: CommissionStatus,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) {
    return {
      ok: false,
      reason: `Komisyon zaten "${COMMISSION_STATUS_LABELS[to].toLocaleLowerCase("tr-TR")}" durumunda.`,
    };
  }
  if (!TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      reason: `"${COMMISSION_STATUS_LABELS[from]}" durumundan bu geçiş yapılamaz.`,
    };
  }
  return { ok: true };
}

export function availableCommissionTransitions(
  from: CommissionStatus,
): CommissionStatus[] {
  return [...TRANSITIONS[from]];
}

/* ==========================================================================
   Komisyon hesabı
   ========================================================================== */

/**
 * Satış bedeli × prim oranı.
 *
 * ORAN BUGÜNKÜ ORAN, satışın kapandığı andaki oran değil. Bedeli kabul
 * edildi: `sales` satırında oran dondurulmuyor (gerekçe
 * `0011_commission.sql` başlığında). Ofis tek ve oranlar nadiren değişiyor;
 * değiştiğinde geçmiş dökümler de yeni orana göre yeniden hesaplanıyor.
 *
 * Kuruş YUVARLANIYOR: tutarlar `bigint` kolonundan geliyor ve arayüz tam sayı
 * gösteriyor; yuvarlamayı burada yapmak, toplamların satır toplamlarıyla
 * uyuşmasını garanti ediyor.
 */
export function commissionFor(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0;
  return Math.round(amount * rate);
}

export type CommissionTotals = {
  total: number;
  collected: number;
  pending: number;
  overdue: number;
  /** Tahsil edilen / toplam — 0–1 arası; toplam sıfırsa 0. */
  collectionRate: number;
};

/** Boş başlangıç — çağıranlar bunun üzerine topluyor. */
export function emptyTotals(): CommissionTotals {
  return {
    total: 0,
    collected: 0,
    pending: 0,
    overdue: 0,
    collectionRate: 0,
  };
}

/**
 * Komisyon satırlarını duruma göre toplar.
 *
 * SAF: girdisi hazır bir dizi, sorgu açmıyor. Bu yüzden testten geçiyor
 * (`revenue.test.ts`) ve hem genel özet hem danışman dökümü aynı hesabı
 * kullanıyor — iki yerde ayrı toplama, er ya da geç birbirinden sapar.
 */
export function sumCommissions(
  rows: readonly { commission: number; commission_status: CommissionStatus }[],
): CommissionTotals {
  const totals = emptyTotals();

  for (const row of rows) {
    totals.total += row.commission;
    totals[row.commission_status] += row.commission;
  }

  totals.collectionRate =
    totals.total > 0 ? totals.collected / totals.total : 0;

  return totals;
}

/* ==========================================================================
   Dönem seçimi
   ========================================================================== */

/**
 * Gelirler ve Raporlar aynı dönem seçeneklerini paylaşıyor.
 *
 * Gün sayısı olarak duruyor, "ay" olarak değil: ay uzunlukları değişken ve
 * karşılaştırmalı bir grafikte 28 ile 31 günlük kovalar yanıltıcı olur.
 */
export const PERIOD_OPTIONS = [
  { value: "30", label: "Son 30 gün", days: 30 },
  { value: "90", label: "Son 3 ay", days: 90 },
  { value: "180", label: "Son 6 ay", days: 180 },
  { value: "365", label: "Son 1 yıl", days: 365 },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

export const DEFAULT_PERIOD: PeriodValue = "180";

/** Geçersiz değer sessizce varsayılana düşer — `search-params.ts` kuralı. */
export function periodDays(value: string | undefined): number {
  const match = PERIOD_OPTIONS.find((option) => option.value === value);
  return (match ?? PERIOD_OPTIONS.find((o) => o.value === DEFAULT_PERIOD)!).days;
}

export function periodLabel(value: string | undefined): string {
  const match = PERIOD_OPTIONS.find((option) => option.value === value);
  return (
    match ?? PERIOD_OPTIONS.find((o) => o.value === DEFAULT_PERIOD)!
  ).label;
}
