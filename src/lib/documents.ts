import type { DocumentType } from "@/types/database";

/**
 * ============================================================================
 * EVRAK SÖZLÜĞÜ
 * ============================================================================
 * `lib/listings.ts`, `lib/customers.ts` ve `lib/work-notes.ts` ile aynı desen:
 * etiketler, tonlar ve saf kurallar burada; veri katmanı yalnızca ham değeri
 * taşır.
 *
 * FAZ 18'DE BÖLÜNDÜ. Bu içerik `lib/messaging.ts` içindeydi ve o dosya üç
 * modülün (mesaj, evrak, bildirim) sözlüğünü birlikte taşıyordu. Mesajlaşma
 * kalkınca dosyanın adı da içeriği de yanıltıcı hâle geldi — Faz 13'te AI
 * Asistan kaldırılırken uygulanan kuralın aynısı: kaldırılan bir kavramın adı
 * kodda kalmaz.
 */

/**
 * Türlerin SIRASI — etiketler sözlükte (`documents.type.*`).
 *
 * `'pdf'` diğer üçüyle aynı düzlemde değil (biri biçim, üçü belge cinsi);
 * sınıflandırılmamış belgelerin kovası olarak duruyor ve çevirisi bunu
 * söylüyor ("Genel belge" / "General document") — "PDF" deseydi bir Word
 * belgesi seçilirken kafa karıştırırdı.
 */
export const DOCUMENT_TYPES = [
  "pdf",
  "tapu",
  "kimlik",
  "sozlesme",
] as const satisfies readonly DocumentType[];

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

/**
 * Ek türü.
 *
 * Görselleri önizliyoruz, diğer her şeyi dosya satırı olarak çiziyoruz. Hem
 * evrak yüklemede hem iş notu ekinde aynı kural geçerli — ikisi de aynı
 * private bucket'a gidiyor.
 */
export function attachmentKindFor(mimeType: string): "image" | "file" {
  return mimeType.startsWith("image/") ? "image" : "file";
}
