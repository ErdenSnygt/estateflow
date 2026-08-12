import type { NotificationEntity, NotificationType } from "@/types/database";

/**
 * ============================================================================
 * BİLDİRİM SÖZLÜĞÜ
 * ============================================================================
 * Faz 18'de `lib/messaging.ts` üçe bölündü; bu, bildirim payı. Aynı fazda
 * bildirim türleri de değişti: `message_received` kalktı (mesaj kavramı
 * kalktı), yerine iş notu olaylarının üçlüsü geldi.
 *
 * Faz 23'te ETİKETLER SÖZLÜĞE TAŞINDI (`notifications.type.*`); geride yalnızca
 * hangi türler var ve hangi sırayla — `lib/listings.ts` ile aynı ayrım.
 *
 * DİKKAT: bu, bildirim SATIRLARININ metni değil. Satırın başlığı ve açıklaması
 * (`notifications.title` / `.description`) yazılırken üretiliyor ve
 * VERİTABANINDA duruyor; sonradan okuyanın diline göre değişemez. Buradaki
 * etiketler yalnızca TÜR adı — gelen kutusunun altındaki açıklama şeridinde ve
 * ileride bir filtre gerekirse orada kullanılıyor.
 */

/** Gelen kutusunun tür şeridinde bu sırayla listeleniyor. */
export const NOTIFICATION_TYPES = [
  "customer_added",
  "listing_created",
  "sale_closed",
  "appointment_scheduled",
  "work_note_mention",
  "work_note_assigned",
  "work_note_resolved",
] as const satisfies readonly NotificationType[];

/**
 * Bildirimin işaret ettiği kayda giden adres.
 *
 * Bağ POLİMORFİK (yabancı anahtar yok, `entity_type` + `entity_id` ikilisi),
 * yani hedef silinmiş olabilir. Böyle bir durumda `null` dönüyor ve arayüz
 * bildirimi tıklanamaz bir satır olarak çiziyor — kırık bir bağlantıya
 * tıklatıp 404 göstermektense.
 */
export function notificationHref(
  entityType: NotificationEntity | null,
  entityId: string | null,
): string | null {
  if (!entityType || !entityId) return null;

  switch (entityType) {
    case "customer":
      return `/musteriler/${entityId}`;
    case "listing":
      return `/ilanlar/${entityId}`;
    case "sale":
      return "/satislar";
    case "appointment":
      return "/randevular";
    /* Notun kendisine değil PANODAKİ satırına gidiliyor: `?n=` parametresi
       sekmeyi "Tüm ekip"e alıp o notu açıyor. Notun tek başına bir detay
       sayfası yok ve olmamalı — bir not, bağlamı olmadan okunacak bir şey
       değil (`0012_work_notes.sql`). */
    case "work_note":
      return `/mesajlar?f=all&n=${entityId}`;
  }
}
