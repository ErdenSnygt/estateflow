"use server";

import { cookies, headers } from "next/headers";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  defaultLocale,
  locales,
  toLocale,
  type Locale,
} from "@/i18n/config";

/**
 * ============================================================================
 * DİL TERCİHİNİN OKUNMASI VE YAZILMASI
 * ============================================================================
 * Tercih çerezde; gerekçesi `i18n/config.ts` başlığında (çeviriler sunucuda
 * çözülüyor, `localStorage` sunucudan okunamaz).
 *
 * `"use server"` TAŞIYOR çünkü `setUserLocale` bir form/düğme eyleminden
 * çağrılıyor. Yazma tarafında bir güvenlik sorusu yok: kullanıcı yalnızca
 * kendi arayüz dilini değiştiriyor ve değer `toLocale()` ile bilinen kümeye
 * daraltılıyor — uydurma bir değer çereze yazılamıyor.
 */

/**
 * Aktif dil.
 *
 * Sıra: ÇEREZ → tarayıcı ipucu → varsayılan.
 *
 * Tarayıcı ipucu (`Accept-Language`) yalnızca İLK ziyarette devreye giriyor,
 * yani kullanıcı henüz bir seçim yapmamışken. Seçim yapıldıktan sonra çerez
 * kazanıyor ve tarayıcı diline bir daha bakılmıyor — aksi hâlde İngilizce
 * tarayıcı kullanan biri Türkçeyi her seferinde yeniden seçmek zorunda
 * kalırdı.
 */
export async function getUserLocale(): Promise<Locale> {
  const store = await cookies();
  const saved = store.get(LOCALE_COOKIE)?.value;
  if (saved) return toLocale(saved);

  return negotiateFromHeaders();
}

/**
 * `Accept-Language` başlığından desteklenen bir dil seçer.
 *
 * Tam bir RFC 4647 eşleştirmesi DEĞİL ve olmasına gerek yok: iki dilimiz var.
 * Başlıktaki her etiketin yalnızca birincil alt etiketine ("en-GB" → "en")
 * bakılıyor ve q-değeri sırası korunuyor.
 *
 * Başlık okunamazsa varsayılana düşüyor — bu fonksiyon hiçbir koşulda
 * fırlatmıyor, çünkü çağıranı layout ve orada bir istisna tüm uygulamayı
 * hata ekranına düşürürdü.
 */
async function negotiateFromHeaders(): Promise<Locale> {
  try {
    const header = (await headers()).get("accept-language");
    if (!header) return defaultLocale;

    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const q = params
          .map((p) => p.trim())
          .find((p) => p.startsWith("q="))
          ?.slice(2);
        return {
          primary: tag.trim().toLowerCase().split("-")[0],
          quality: q ? Number(q) : 1,
        };
      })
      .filter((entry) => Number.isFinite(entry.quality))
      .sort((a, b) => b.quality - a.quality);

    for (const entry of ranked) {
      if (locales.includes(entry.primary as Locale)) {
        return entry.primary as Locale;
      }
    }
  } catch {
    /* `headers()` bazı bağlamlarda çağrılamaz; sessizce varsayılana düşüyoruz. */
  }

  return defaultLocale;
}

/**
 * Dili değiştirir.
 *
 * SAYFAYI KENDİSİ TAZELEMİYOR: `revalidatePath` yerine çağıran taraf
 * `router.refresh()` diyor (`components/layout/language-switcher.tsx`).
 * Gerekçe, tazelemenin yönlendirmeyle birlikte yapılması gereken yerlerin
 * olması — çağıran kendi bağlamını biliyor, bu fonksiyon bilmiyor.
 */
export async function setUserLocale(value: string): Promise<void> {
  const locale = toLocale(value);
  const store = await cookies();

  store.set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    /* `httpOnly` DEĞİL ve bu bilinçli: değer gizli bir şey taşımıyor, üstelik
       ileride istemci tarafında bir okuma gerekirse (ör. üçüncü parti bir
       takvim bileşenine dil geçirmek) erişilebilir olması gerekiyor. */
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
