/**
 * ============================================================================
 * DİL YAPILANDIRMASI
 * ============================================================================
 * Faz 19. `config/site.ts` gibi saf bir sabit dosyası: hem sunucu hem istemci
 * tarafı buradan okuyor, hiçbir yan etkisi yok.
 *
 * -----------------------------------------------------------------------------
 * NEDEN URL'DE DİL ÖNEKİ YOK
 * -----------------------------------------------------------------------------
 * next-intl'in varsayılan kurulumu `/tr/ilanlar`, `/en/ilanlar` gibi bir
 * segment ekler ve `app/[locale]/…` yapısı ister. Bu projede seçilmedi; üç
 * somut sebebi var:
 *
 *  1. ROUTE'LAR TÜRKÇE SLUG. `/ilanlar`, `/musteriler`, `/randevular` —
 *     bunlar İngilizce arayüzde de aynı kalacak (adresleri çevirmek her
 *     bağlantıyı, her `revalidatePath()` çağrısını ve kaydedilmiş bağlantıları
 *     kırardı). Yani önek yalnızca gürültü eklerdi: `/en/ilanlar`.
 *
 *  2. MIDDLEWARE ZATEN SAHİPLİ. `src/middleware.ts` her isteği görüyor ve
 *     yönlendirme kararlarını o veriyor (`/` → dashboard, oturumsuz → login,
 *     `?next=` ile geri dönüş). next-intl'in kendi middleware'i de yönlendirme
 *     yapıyor; ikisini zincirlemek iki ayrı yönlendirme otoritesi demekti ve
 *     `?next=` parametresi ilk turda dil önekini de taşımaya başlardı.
 *
 *  3. DİL BİR KULLANICI TERCİHİ, BİR ADRES DEĞİL. Bu bir pazarlama sitesi
 *     değil, oturum arkasında bir CRM: sayfalar zaten indekslenmiyor, yani
 *     önekin SEO faydası da yok. Tercih çerezde duruyor ve kullanıcıya ait.
 *
 * Bedeli: aynı adres iki farklı dilde farklı içerik döndürüyor, yani sayfalar
 * dil çerezine göre değişken. Uygulamanın tamamı zaten `dynamic` (oturum
 * gerektiriyor), o yüzden pratikte bir kayıp yok.
 */

export const locales = ["tr", "en"] as const;

export type Locale = (typeof locales)[number];

/** Çerez yoksa ve tarayıcı ipucu okunamıyorsa düşülen dil. */
export const defaultLocale: Locale = "tr";

/**
 * Tercihin saklandığı çerez adı.
 *
 * `next-themes` temayı `localStorage`da tutuyor; dil ÇEREZDE tutuluyor ve fark
 * bilinçli: çeviriler SUNUCUDA çözülüyor (`useTranslations` sunucu
 * bileşenlerinde de çalışıyor), yani sunucunun ilk istekte dili bilmesi
 * gerekiyor. `localStorage` sunucudan okunamaz — o yolda ilk boyama hep
 * Türkçe çizilir, sonra istemci İngilizceye çevirir ve kullanıcı bir kare
 * yanlış dil görürdü. Faz 9'da sidebar genişliğinde yaşanan sorunun aynısı.
 */
export const LOCALE_COOKIE = "estateflow-locale";

/** Bir yıl: dil tercihi oturumdan bağımsız, çıkış yapınca sıfırlanmamalı. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Açılır menüdeki etiketler — her dil KENDİ adıyla yazılı, çevrilmiyor. */
export const LOCALE_LABELS: Record<Locale, string> = {
  /* "Türkçe" İngilizce arayüzde de "Türkçe" kalıyor, "Turkish" olmuyor: dil
     seçicide kullanıcı ARADIĞI dili kendi yazımıyla arıyor. Bu, dil
     seçicilerinin evrensel kuralı. */
  tr: "Türkçe",
  en: "English",
};

/** Rozet/kısaltma gösterimi (TR / EN). */
export const LOCALE_SHORT: Record<Locale, string> = {
  tr: "TR",
  en: "EN",
};

/** Bilinmeyen bir değeri güvenli bir dile indirger. */
export function toLocale(value: string | undefined | null): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}
