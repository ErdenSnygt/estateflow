import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * ============================================================================
 * STORAGE ADRES ŞEMASI
 * ============================================================================
 * Hem tarayıcı (yükleme) hem sunucu (silme) tarafından kullanılır, bu yüzden
 * hiçbir tarafa özgü bir şey içermez.
 *
 * DOSYA YOLU DÜZ: `<bucket>/<uuid>.<ext>`. Klasör hiyerarşisi yok ve bunun
 * somut bir sebebi var — dosya, ilgili KAYIT DAHA VAR OLMADAN yükleniyor.
 * İlan kimliği (`iln-1102`) veritabanındaki diziden INSERT anında geliyor;
 * kullanıcı fotoğrafı sürüklediğinde henüz ortada bir ilan yok. `listings/
 * <ilan_id>/foto.jpg` şeması ancak "önce taslak klasöre yükle, kayıttan sonra
 * taşı" akışıyla kurulabilirdi; o da yarıda bırakılan her formda çöp bırakırdı.
 */

/**
 * PUBLIC BUCKET'LAR — içeriği zaten yayınlanmak için var.
 *
 * İlan fotoğrafı portallara çıkacak, portre avatarı arayüzde herkese görünüyor;
 * "sızması" diye bir kavram yok. Kalıcı public URL bu yüzden sorun değil.
 */
export const PUBLIC_BUCKETS = ["listings", "avatars"] as const;
export type PublicBucket = (typeof PUBLIC_BUCKETS)[number];

/**
 * PRIVATE BUCKET — tapu, kimlik, sözleşme ve mesaj ekleri.
 *
 * Kalıcı adresi YOK: erişim oturum gerektiriyor ve indirme anında süreli bir
 * imzalı URL üretiliyor (`lib/storage/signed.ts`). Ayrımın tam gerekçesi
 * `0009_documents_storage.sql` başlığında ve README'de.
 */
export const PRIVATE_BUCKET = "documents" as const;
export type PrivateBucket = typeof PRIVATE_BUCKET;

export const STORAGE_BUCKETS = [...PUBLIC_BUCKETS, PRIVATE_BUCKET] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

/** Bucket seviyesindeki sınırın aynısı — `0003_storage.sql` ile eşleşmeli. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Belge sınırı görselden yüksek: taranmış çok sayfalı bir sözleşme PDF'i
 * fotoğraftan büyük olabiliyor ve burada sıkıştırma yok — belge içeriği
 * kayıpsız kalmalı. `0009_documents_storage.sql` ile eşleşmeli.
 */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** `<input accept>` değeri. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_MIME_TYPES.join(",");

/** Belge yükleme — görsellere ek olarak PDF ve Word. */
export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ACCEPT_DOCUMENT_ATTRIBUTE = ACCEPTED_DOCUMENT_TYPES.join(",");

/** Uzantı çıkarımı — nesne yolu `<uuid>.<ext>` biçiminde kuruluyor. */
export const DOCUMENT_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;

export function publicUrlFor(bucket: PublicBucket, path: string): string {
  return `${PUBLIC_PREFIX}${bucket}/${path}`;
}

/**
 * Public URL'i bucket + yol ikilisine çözer.
 *
 * DIŞ ADRESLER İÇİN `null` DÖNER ve bu davranış kritik: seed'den gelen görseller
 * `picsum.photos` / `i.pravatar.cc` adreslerinde duruyor. Silme akışı bu
 * fonksiyonun sonucuna bakıyor, dolayısıyla bir ilan silindiğinde seed
 * görsellerini silmeye ÇALIŞMIYOR bile — zaten bizim bucket'ımızda değiller.
 */
export function parseStorageUrl(
  url: string,
): { bucket: PublicBucket; path: string } | null {
  if (!url.startsWith(PUBLIC_PREFIX)) return null;

  const rest = url.slice(PUBLIC_PREFIX.length);
  const separator = rest.indexOf("/");
  if (separator <= 0) return null;

  const bucket = rest.slice(0, separator);
  const path = rest.slice(separator + 1);

  /* Yalnızca PUBLIC bucket'lar: private bucket'ın `/object/public/` altında
     bir adresi hiç olmuyor, dolayısıyla buraya düşen bir `documents` yolu
     ancak uydurma olabilir. */
  if (!PUBLIC_BUCKETS.includes(bucket as PublicBucket) || !path) return null;

  /* Sorgu dizesi (ör. `?t=…` önbellek kırıcı) yola dahil edilmemeli. */
  return { bucket: bucket as PublicBucket, path: path.split("?")[0] };
}

/** "4,2 MB" — hata mesajlarında kullanılır. */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
