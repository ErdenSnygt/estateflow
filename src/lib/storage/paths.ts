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

export const STORAGE_BUCKETS = ["listings", "avatars"] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

/** Bucket seviyesindeki sınırın aynısı — `0003_storage.sql` ile eşleşmeli. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** `<input accept>` değeri. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_MIME_TYPES.join(",");

const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;

export function publicUrlFor(bucket: StorageBucket, path: string): string {
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
): { bucket: StorageBucket; path: string } | null {
  if (!url.startsWith(PUBLIC_PREFIX)) return null;

  const rest = url.slice(PUBLIC_PREFIX.length);
  const separator = rest.indexOf("/");
  if (separator <= 0) return null;

  const bucket = rest.slice(0, separator);
  const path = rest.slice(separator + 1);

  if (!STORAGE_BUCKETS.includes(bucket as StorageBucket) || !path) return null;

  /* Sorgu dizesi (ör. `?t=…` önbellek kırıcı) yola dahil edilmemeli. */
  return { bucket: bucket as StorageBucket, path: path.split("?")[0] };
}

/** "4,2 MB" — hata mesajlarında kullanılır. */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
