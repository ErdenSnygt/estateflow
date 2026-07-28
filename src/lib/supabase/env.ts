/**
 * ============================================================================
 * SUPABASE ORTAM DEĞİŞKENLERİ
 * ============================================================================
 * Üç istemci (tarayıcı, sunucu, middleware) aynı iki değeri okuyor. Tek yerde
 * toplanır ki eksik yapılandırma "undefined is not a valid URL" gibi anlaşılmaz
 * bir hata yerine ne yapılması gerektiğini söyleyen bir mesaj versin.
 *
 * NEXT_PUBLIC_ öneki bilinçli: anon/publishable anahtar tarayıcıya gider ve
 * gitmesi gerekir — verinin korunması RLS politikalarının işidir, anahtarın
 * gizlenmesinin değil. Servis anahtarı ise yalnızca seed script'inde,
 * NEXT_PUBLIC_ olmadan kullanılır.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} tanımlı değil. .env.local dosyasına Supabase proje ayarlarındaki değeri ekleyin.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
