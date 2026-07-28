import { createClient } from "@/lib/supabase/server";
import { parseStorageUrl, type StorageBucket } from "@/lib/storage/paths";

/**
 * ============================================================================
 * YETİM DOSYA TEMİZLİĞİ
 * ============================================================================
 * Storage yabancı anahtar cascade'ine DAHİL DEĞİL. Bir ilan satırı silinince
 * `customer_listing_interests` ve `activity_log` satırları cascade ile gider
 * ama `listings.images` içindeki dosyalar bucket'ta kalır. Kimse fark etmez,
 * bucket sessizce şişer.
 *
 * Bu yüzden cascade'in son halkası uygulama tarafında, server action'larda
 * kuruluyor. Tetiklendiği noktalar `lib/actions/*` içinde işaretli.
 *
 * Yalnızca sunucu tarafı: `lib/supabase/server` üzerinden `next/headers`
 * içeri alınıyor, istemciden import edilirse derleme hatası verir.
 *
 * -----------------------------------------------------------------------------
 * SİLME HATASI KULLANICININ İŞLEMİNİ BOZMAZ
 * -----------------------------------------------------------------------------
 * Fonksiyon istisna fırlatmaz. "İlan silindi ama fotoğrafı silinemedi" durumu
 * kullanıcı için bir başarısızlık değil; asıl işlem tamamlandı. Tersi olsaydı
 * bucket'taki geçici bir sorun ilan silmeyi engellerdi. Sorun sunucu
 * günlüğüne yazılır.
 */
export async function removeStorageObjects(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  /* Dış adresler (seed'den gelen picsum / pravatar görselleri) burada elenir:
     `parseStorageUrl` bizim bucket'ımızda olmayan her şeye null döner. */
  const byBucket = new Map<StorageBucket, string[]>();

  for (const url of urls) {
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;

    const paths = byBucket.get(parsed.bucket) ?? [];
    paths.push(parsed.path);
    byBucket.set(parsed.bucket, paths);
  }

  if (byBucket.size === 0) return;

  const supabase = await createClient();

  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, paths]) => {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        console.error(
          `[storage] ${bucket} temizliği başarısız (${paths.length} dosya): ${error.message}`,
        );
      }
    }),
  );
}

/**
 * İki listeyi karşılaştırıp ARTIK KULLANILMAYANLARI siler.
 *
 * Güncelleme akışında gerekiyor: kullanıcı formdan üç fotoğraftan birini
 * çıkarıp kaydettiğinde, kalan ikisine dokunulmadan çıkarılan silinmeli.
 */
export async function removeUnusedObjects(
  previous: string[],
  next: string[],
): Promise<void> {
  const kept = new Set(next);
  await removeStorageObjects(previous.filter((url) => !kept.has(url)));
}
