import type { Json, NotificationType } from "@/types/supabase";

/**
 * ============================================================================
 * BİLDİRİM TERCİHLERİ
 * ============================================================================
 * `agents.notification_preferences` bir jsonb kolonu ve İÇERİĞİ VERİTABANI
 * TARAFINDAN DENETLENMİYOR: eksik anahtar, fazladan anahtar, yanlış tip —
 * hepsi yazılabilir. Şemada bunu dar bir tiple göstermek garanti değil,
 * temenni olurdu (gerekçe `types/supabase.ts` içindeki kolon yorumunda).
 *
 * Bu dosya o ham değeri güvenli bir şekle çeviriyor ve saf olduğu için
 * veritabanı olmadan test edilebiliyor.
 *
 * VARSAYILAN "AÇIK" VE BU YÖN ÖNEMLİ: tanımadığımız ya da eksik bir anahtar
 * bildirimi SUSTURMUYOR, geçiriyor. Tersi olsaydı kolon şeması değiştiğinde
 * ya da yeni bir bildirim türü eklendiğinde kullanıcılar sessizce bildirim
 * almayı bırakır ve kimse nedenini aramazdı. Fazladan bir bildirim fark
 * edilir; eksik bildirim edilmez.
 */

export type NotificationPreferences = Record<NotificationType, boolean>;

/** Tüm türler açık — yeni personelin ve bozuk verinin düştüğü hâl. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  customer_added: true,
  listing_created: true,
  sale_closed: true,
  message_received: true,
  appointment_scheduled: true,
};

/** Ayarlar formundaki satırlar — etiket ve açıklama tek yerde. */
export const NOTIFICATION_PREFERENCE_FIELDS: {
  type: NotificationType;
  label: string;
  description: string;
}[] = [
  {
    type: "customer_added",
    label: "Yeni müşteri atandı",
    description: "Bir yönetici üzerinize müşteri kaydettiğinde.",
  },
  {
    type: "listing_created",
    label: "Portföye ilan eklendi",
    description: "Bir yönetici portföyünüze ilan girdiğinde.",
  },
  {
    type: "sale_closed",
    label: "Satış kapandı",
    description: "İlanınıza gelen bir teklif kabul edildiğinde.",
  },
  {
    type: "message_received",
    label: "Yeni mesaj",
    description: "Müşterilerinizden biri mesaj gönderdiğinde.",
  },
  {
    type: "appointment_scheduled",
    label: "Randevu planlandı",
    description: "Takviminize bir randevu eklendiğinde.",
  },
];

/**
 * Ham jsonb → güvenli tercih nesnesi.
 *
 * Yalnızca `false` KAPATIYOR. `undefined`, `null`, metin, sayı — hepsi açık
 * sayılıyor; yukarıdaki "eksik bildirim fark edilmez" gerekçesi.
 */
export function parseNotificationPreferences(
  value: Json | null | undefined,
): NotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const raw = value as Record<string, Json | undefined>;
  const result = { ...DEFAULT_NOTIFICATION_PREFERENCES };

  for (const type of Object.keys(result) as NotificationType[]) {
    if (raw[type] === false) result[type] = false;
  }

  return result;
}

/**
 * Form çıktısı → veritabanına yazılacak nesne.
 *
 * Bilinmeyen anahtarlar DÜŞÜYOR: istemciden gelen bir gövde jsonb'ye istediği
 * alanı ekleyemesin. Kolon şemasız olduğu için bu temizlik burada yapılmazsa
 * hiçbir yerde yapılmaz.
 */
export function serializeNotificationPreferences(
  preferences: Partial<NotificationPreferences>,
): NotificationPreferences {
  const result = { ...DEFAULT_NOTIFICATION_PREFERENCES };

  for (const type of Object.keys(result) as NotificationType[]) {
    if (preferences[type] === false) result[type] = false;
  }

  return result;
}

/** Tek türün açık olup olmadığı — `notify()` bunu soruyor. */
export function isNotificationEnabled(
  value: Json | null | undefined,
  type: NotificationType,
): boolean {
  return parseNotificationPreferences(value)[type];
}
