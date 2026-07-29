import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PRIVATE_BUCKET } from "@/lib/storage/paths";

/**
 * ============================================================================
 * İMZALI URL ÜRETİMİ (private `documents` bucket'ı)
 * ============================================================================
 * Public bucket'larda adres sabit ve `publicUrlFor()` ile hesaplanıyor.
 * Burada öyle bir adres YOK: her erişim için süreli bir imza üretiliyor.
 *
 * -----------------------------------------------------------------------------
 * NEDEN `server-only`
 * -----------------------------------------------------------------------------
 * İmza kullanıcının kendi oturumuyla alınıyor, servis anahtarıyla değil — yani
 * `storage.objects` politikası ve dolaylı olarak `documents` tablosunun RLS'i
 * hâlâ geçerli. Yine de bu dosya istemciye SIZMAMALI: imzalama isteği
 * tarayıcıdan yapılsaydı, bir kullanıcı elindeki her yol için imza denemesi
 * yapabilirdi. Sunucuda ise imza ancak satırı okuyabildiği belgeler için
 * isteniyor — çağıranlar önce tabloyu sorguluyor.
 *
 * -----------------------------------------------------------------------------
 * SÜRE NEDEN KISA
 * -----------------------------------------------------------------------------
 * 60 saniye. İmzalı URL bir kez üretildikten sonra İPTAL EDİLEMEZ; süresi
 * dolana kadar onu ele geçiren herkes indirir. Tapu ve kimlik fotokopisi için
 * bu pencere dar olmalı. Kullanıcı açısından maliyeti yok: bağlantı tıklandığı
 * anda üretiliyor ve hemen kullanılıyor.
 *
 * Sonuç bilinçli olarak ÖNBELLEKLENMİYOR (`cache()` yok): önbelleğe alınmış bir
 * imza, süresi dolmuş bir bağlantı servis etme riski taşır.
 */

/** İmzanın geçerlilik süresi (saniye). */
export const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Tek bir nesne için imzalı indirme adresi.
 *
 * `download` verilirse tarayıcı dosyayı görüntülemek yerine bu adla indirir —
 * bir PDF'in sekmede açılması yerine "Tapu — Kadıköy.pdf" olarak inmesi
 * kullanıcının beklediği davranış.
 *
 * Hata durumunda `null`: eksik bir dosya, sayfanın tamamını hata ekranına
 * çevirmemeli. Arayüz bağlantıyı pasif gösteriyor.
 */
export async function signedUrlFor(
  path: string,
  options: { download?: string } = {},
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
      download: options.download,
    });

  if (error || !data) {
    console.error(`[storage] imzalı URL üretilemedi (${path}): ${error?.message}`);
    return null;
  }

  return data.signedUrl;
}

/**
 * Birden çok nesne için tek çağrıda imza.
 *
 * TEK TEK İMZALAMAK LİSTELERDE PAHALI: 20 belgelik bir sayfa 20 ağ turu
 * demekti. `createSignedUrls` hepsini tek istekte imzalıyor.
 *
 * Dönen harita YOL → URL. İmzalanamayan yollar haritada hiç yer almıyor;
 * çağıran `undefined` görünce bağlantıyı pasif çiziyor.
 */
export async function signedUrlsFor(
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error(`[storage] toplu imzalama başarısız: ${error?.message}`);
    return new Map();
  }

  const result = new Map<string, string>();
  for (const item of data) {
    /* Supabase her yol için ayrı bir hata alanı döner; başarısız olanlar
       atlanıyor, başarılılar etkilenmiyor. */
    if (item.error || !item.signedUrl || !item.path) continue;
    result.set(item.path, item.signedUrl);
  }

  return result;
}
