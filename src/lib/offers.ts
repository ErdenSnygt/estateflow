import type { OfferStatus } from "@/types/database";
import type { ActionErrorKey } from "@/lib/actions/result";

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

/* --- Durumlar ------------------------------------------------------------- */

/** Filtre açılırında bu sırayla çiziliyor; etiketler `offers.status.*`. */
export const OFFER_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "expired",
] as const satisfies readonly OfferStatus[];

export const OFFER_STATUS_TONES: Record<
  OfferStatus,
  "warning" | "success" | "danger" | "neutral"
> = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
};

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

/**
 * Geçiş reddi ARTIK METİN DEĞİL ANAHTAR taşıyor.
 *
 * Bu fonksiyon saf ve senkron; çeviriyi kendisi yapamaz (dil isteğe bağlı,
 * `getTranslations` asenkron). `params` içindeki değerler DURUM DEĞERLERİ —
 * çağıran action onları kendi sözlüğünden etikete çevirip `fail`e veriyor.
 * Gerekçenin tamamı `lib/actions/result.ts` başlığında.
 */
export type TransitionCheck =
  | { ok: true }
  | { ok: false; error: ActionErrorKey; params: Record<string, OfferStatus> };

/** Bir teklifin `from` durumundan `to` durumuna geçmesi geçerli mi. */
export function canTransition(
  from: OfferStatus,
  to: OfferStatus,
): TransitionCheck {
  if (from === to) {
    return { ok: false, error: "offerAlreadyInStatus", params: { status: to } };
  }

  if (!TRANSITIONS[from].includes(to)) {
    return { ok: false, error: "offerTerminal", params: { status: from } };
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

/**
 * Sıralama ANAHTARLARI — etiketler sözlükte (`offers.sort.*`, `sales.sort.*`).
 *
 * Değerler tire içeriyor (`amount-desc`) ama sözlükte camelCase duruyorlar;
 * dönüşüm `lib/listings.ts` ve `lib/customers.ts` ile aynı desende, tek yerde.
 *
 * İKİ AYRI DİZİ, aynı içerik: teklif ve satış listeleri bugün aynı üç seçeneği
 * paylaşıyor ama ayrı URL anahtarlarında yaşıyorlar ve birinin seçenekleri
 * değişirse diğerini sürüklememeli.
 */
export const OFFER_SORT_KEYS = [
  "recent",
  "amount-desc",
  "amount-asc",
] as const;

export type OfferSortKey = (typeof OFFER_SORT_KEYS)[number];

export const SALE_SORT_KEYS = [
  "recent",
  "amount-desc",
  "amount-asc",
] as const;

export type SaleSortKey = (typeof SALE_SORT_KEYS)[number];

/** Sözlükteki anahtar adı — iki liste de aynı üçlüyü kullanıyor. */
export type SortMessageKey = "recent" | "amountDesc" | "amountAsc";

export const SORT_MESSAGE_KEY: Record<OfferSortKey, SortMessageKey> = {
  recent: "recent",
  "amount-desc": "amountDesc",
  "amount-asc": "amountAsc",
};
