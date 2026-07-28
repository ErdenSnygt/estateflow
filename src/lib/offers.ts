import type { OfferStatus } from "@/types/database";

/**
 * ============================================================================
 * TEKLİF ARAYÜZ SÖZLÜĞÜ VE DURUM KURALLARI
 * ============================================================================
 * `lib/listings.ts` ve `lib/customers.ts` ile aynı desende: etiketler ve rozet
 * tonları burada durur, veri katmanı yalnızca ham değeri taşır.
 *
 * Bu dosyanın fazladan bir işi daha var — DURUM GEÇİŞ KURALLARI. Kural
 * bilinçli olarak server action'ın içinde değil burada: saf bir fonksiyon
 * olduğu için veritabanı olmadan test edilebiliyor ve arayüz (hangi düğmeler
 * gösterilecek) ile sunucu (geçiş geçerli mi) aynı kaynağa bakıyor. İkisi ayrı
 * yerlerde yazılsaydı arayüz olmayan bir düğmeyi gösterirdi.
 */

/* --- Etiketler ------------------------------------------------------------ */

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: "Bekliyor",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  expired: "Süresi doldu",
};

export const OFFER_STATUS_TONES: Record<
  OfferStatus,
  "warning" | "success" | "danger" | "neutral"
> = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
};

export const OFFER_STATUS_OPTIONS = (
  Object.keys(OFFER_STATUS_LABELS) as OfferStatus[]
).map((value) => ({ value, label: OFFER_STATUS_LABELS[value] }));

/* --- Durum geçişleri ------------------------------------------------------ */

/**
 * Bir tekliften çıkılabilecek durumlar.
 *
 * TEK YÖNLÜ VE TERMİNAL: yalnızca `pending` bir şeye dönüşebilir. Kabul
 * edilmiş bir teklifi "yine de reddet" yapmak, ona bağlı satış satırını ve
 * ilanın `satildi` durumunu geri almayı gerektirirdi — sessizce yapılamayacak,
 * kullanıcının açıkça istemesi gereken bir şey. Geri alma akışı gelene kadar
 * kapı kapalı.
 */
const TRANSITIONS: Record<OfferStatus, readonly OfferStatus[]> = {
  pending: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: string };

/** Bir teklifin `from` durumundan `to` durumuna geçmesi geçerli mi. */
export function canTransition(
  from: OfferStatus,
  to: OfferStatus,
): TransitionCheck {
  if (from === to) {
    return {
      ok: false,
      reason: `Teklif zaten "${OFFER_STATUS_LABELS[to].toLocaleLowerCase("tr-TR")}" durumunda.`,
    };
  }

  if (!TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      reason: `"${OFFER_STATUS_LABELS[from]}" durumundaki bir teklif değiştirilemez.`,
    };
  }

  return { ok: true };
}

/** Arayüzün hangi aksiyon düğmelerini göstereceği. */
export function availableTransitions(from: OfferStatus): OfferStatus[] {
  return [...TRANSITIONS[from]];
}

/** Terminal durum: üzerinde yapılacak bir işlem kalmamış. */
export function isTerminal(status: OfferStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/**
 * Teklifin kabulü bir satış doğurur mu.
 *
 * Ayrı bir fonksiyon çünkü kural tek yerde durmalı: server action bu yan
 * etkiyi tetiklerken, arayüz de kullanıcıyı uyarırken ("bu işlem ilanı satıldı
 * olarak işaretleyecek") aynı soruyu soruyor.
 */
export function closesSale(to: OfferStatus): boolean {
  return to === "accepted";
}

/* --- Sıralama ------------------------------------------------------------- */

export const OFFER_SORT_OPTIONS = [
  { value: "recent", label: "En yeni" },
  { value: "amount-desc", label: "Tutar (yüksekten)" },
  { value: "amount-asc", label: "Tutar (düşükten)" },
] as const;

export type OfferSortKey = (typeof OFFER_SORT_OPTIONS)[number]["value"];

export const SALE_SORT_OPTIONS = [
  { value: "recent", label: "En yeni" },
  { value: "amount-desc", label: "Tutar (yüksekten)" },
  { value: "amount-asc", label: "Tutar (düşükten)" },
] as const;

export type SaleSortKey = (typeof SALE_SORT_OPTIONS)[number]["value"];
