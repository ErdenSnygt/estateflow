import type {
  DocumentType,
  NotificationEntity,
  NotificationType,
} from "@/types/database";

/**
 * ============================================================================
 * MESAJ / EVRAK / BİLDİRİM ARAYÜZ SÖZLÜĞÜ
 * ============================================================================
 * `lib/offers.ts` ve `lib/appointments.ts` ile aynı desende: etiketler, tonlar
 * ve saf kurallar burada; veri katmanı yalnızca ham değeri taşır. Üç modül tek
 * dosyada çünkü hiçbiri tek başına bir dosyayı dolduracak kadar sözlük
 * taşımıyor ve üçü aynı fazın parçası.
 */

/* ==========================================================================
   Mesaj şablonları
   ========================================================================== */

/**
 * Hazır mesaj metinleri.
 *
 * SABİT METİN, ŞABLON DEĞİŞKENİ YOK. `{{musteri_adi}}` gibi yer tutucular
 * cazip ama bir doldurma motoru, eksik değişkende ne olacağı kararı ve
 * önizleme gerektirir. Şablon kutuya DÜZ METİN olarak doluyor; danışman
 * göndermeden önce zaten okuyor ve kişiselleştiriyor. Beklenen davranış da bu:
 * şablon bir başlangıç noktası, bitmiş bir mesaj değil.
 */
export const MESSAGE_TEMPLATES = [
  {
    id: "randevu-hatirlatma",
    label: "Randevu hatırlatma",
    text: "Merhaba, yarınki randevumuzu hatırlatmak isterim. Görüşmek üzere!",
  },
  {
    id: "yeni-ilan",
    label: "Yeni ilan bilgisi",
    text: "Merhaba, aradığınız kriterlere uyan yeni bir ilan portföyümüze girdi. Detayları paylaşmamı ister misiniz?",
  },
  {
    id: "teklif-durumu",
    label: "Teklif durumu",
    text: "Merhaba, verdiğiniz teklifle ilgili mal sahibinden dönüş aldık. Uygun olduğunuzda görüşebilir miyiz?",
  },
  {
    id: "evrak-talebi",
    label: "Evrak talebi",
    text: "Merhaba, süreci ilerletebilmemiz için kimlik fotokopisi ve tapu bilgilerine ihtiyacımız var. Uygun olduğunuzda iletebilir misiniz?",
  },
  {
    id: "tesekkur",
    label: "Teşekkür",
    text: "Bugünkü görüşmemiz için teşekkür ederim. Aklınıza takılan bir şey olursa buradan yazabilirsiniz.",
  },
] as const;

export type MessageTemplate = (typeof MESSAGE_TEMPLATES)[number];

/* ==========================================================================
   Evrak türleri
   ========================================================================== */

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  /* 'pdf' diğer üçüyle aynı düzlemde değil (biri biçim, üçü belge cinsi);
     sınıflandırılmamış belgelerin kovası olarak duruyor ve etiketi bunu
     söylüyor — "PDF" deseydi bir Word belgesi seçilirken kafa karıştırırdı. */
  pdf: "Genel belge",
  tapu: "Tapu",
  kimlik: "Kimlik",
  sozlesme: "Sözleşme",
};

export const DOCUMENT_TYPE_TONES: Record<
  DocumentType,
  "neutral" | "brand" | "warning" | "success"
> = {
  pdf: "neutral",
  tapu: "brand",
  /* Kimlik `warning`: listede göz ilk oraya gitsin. Kişisel veri içeren tek
     tür bu ve yanlış kişiyle paylaşılması en pahalı olan da bu. */
  kimlik: "warning",
  sozlesme: "success",
};

export const DOCUMENT_TYPE_OPTIONS = (
  Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]
).map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] }));

/**
 * Dosya adından belge türü tahmini.
 *
 * Yükleme sırasında türü elle seçtirmek yerine bir varsayılan öneriliyor;
 * kullanıcı yanlışsa değiştiriyor. "tapu_kadikoy.pdf" yükleyen birine boş bir
 * açılır göstermek gereksiz bir adım.
 */
export function guessDocumentType(fileName: string): DocumentType {
  const name = fileName.toLocaleLowerCase("tr-TR");
  if (/tapu|senet/.test(name)) return "tapu";
  if (/kimlik|nufus|nüfus|ehliyet|pasaport/.test(name)) return "kimlik";
  if (/sozlesme|sözleşme|kontrat|contract/.test(name)) return "sozlesme";
  return "pdf";
}

/** Uzantıyı atıp okunabilir bir başlık üretir — form önerisi olarak. */
export function titleFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return withoutExtension.replace(/[_-]+/g, " ").trim() || fileName;
}

/* ==========================================================================
   Bildirimler
   ========================================================================== */

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  customer_added: "Yeni müşteri",
  listing_created: "Yeni ilan",
  sale_closed: "Satış kapandı",
  message_received: "Yeni mesaj",
  appointment_scheduled: "Randevu planlandı",
};

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
    case "conversation":
      return `/mesajlar?k=${entityId}`;
    case "appointment":
      return "/randevular";
  }
}

/* ==========================================================================
   Ek türü
   ========================================================================== */

/** Görselleri önizliyoruz, diğer her şeyi dosya satırı olarak çiziyoruz. */
export function attachmentKindFor(mimeType: string): "image" | "file" {
  return mimeType.startsWith("image/") ? "image" : "file";
}
