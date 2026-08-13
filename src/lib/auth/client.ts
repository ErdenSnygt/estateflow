"use client";

import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * ============================================================================
 * TARAYICI TARAFI KİMLİK DOĞRULAMA
 * ============================================================================
 * Faz 2'de bu dosya bir çerez yazıp siliyordu ve başında "Supabase'e geçince
 * bu iki fonksiyon `signInWithPassword` / `signOut` çağrılarına dönüşecek"
 * notu vardı. Aynen öyle oldu.
 *
 * Neden tarayıcıda (server action değil): OAuth akışı tarayıcıyı sağlayıcıya
 * yönlendirmek zorunda ve `signInWithOAuth` bu yönlendirme adresini üretiyor.
 * E-posta/şifre girişi de aynı yerde durursa oturum çerezini yazan tek bir
 * istemci olur.
 */

/**
 * ============================================================================
 * GİRİŞ HATALARI — METİN DEĞİL, ANAHTAR
 * ============================================================================
 * Faz 25: bu dosya da `lib/actions/result.ts` ve `lib/storage/upload.ts` ile
 * aynı sınırda — saf bir istemci modülü, aktif dili okuyamıyor. Hata artık
 * `auth.errors.*` altındaki bir anahtar; metni `login-form.tsx` üretiyor.
 *
 * `raw` alanı yine `RawActionError`in karşılığı: Supabase'in tanımadığımız
 * bir hatası için uydurma bir çeviri yerine ham metin.
 */
export type AuthErrorKey =
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "rateLimit"
  | "providerDisabled"
  | "providerDisabledDetail"
  | "network"
  | "unexpected";

export type AuthError = {
  key: AuthErrorKey;
  /** `providerDisabledDetail` için sağlayıcı adı. */
  values?: Record<string, string>;
  /** Sözlükte karşılığı olmayan Supabase metni. */
  raw?: string;
};

export type AuthResult = { ok: true } | { ok: false; error: AuthError };

/**
 * Ham metin GÖSTERİLMEYE DEĞER Mİ?
 *
 * `raw` alanı "sözlükte karşılığı olmayan ama ANLAMLI bir cümle" için var.
 * Supabase her zaman öyle bir şey vermiyor: proje duraklatılmışken gelen
 * yanıtın gövdesi boş bir nesneydi ve giriş ekranında kullanıcıya tek başına
 * `{}` gösterildi. Boş, tek karakterlik ya da boş JSON gövdesine benzeyen bir
 * metin hiçbir şey anlatmıyor — o durumda çevrilmiş genel mesaj daha dürüst.
 */
function meaningful(message: string): boolean {
  const cleaned = message.replace(/[{}[\]":,]/g, " ").trim();

  /* Bir cümle değil, bir değerin adı. Harf içerdikleri için aşağıdaki
     denetimden geçerlerdi. */
  if (/^(null|undefined|error|nan)$/i.test(cleaned)) return false;

  /* Kural: JSON noktalama işaretleri atıldıktan sonra geriye ARDIŞIK ÜÇ HARF
     kalıyorsa bu bir cümledir. `{}`, `[]`, `""` ve boş metin eleniyor; gerçek
     bir hata cümlesi her dilde geçiyor. */
  return /[a-zçğıöşü]{3,}/i.test(cleaned);
}

/**
 * Supabase'in İngilizce hata mesajlarını sözlük anahtarına eşler.
 *
 * DIŞA AKTARILIYOR çünkü test ediliyor (`client.test.ts`): eşlemenin kendisi
 * saf bir fonksiyon ve giriş ekranının kullanıcıya ne söyleyeceğini o
 * belirliyor. Bir kez yanlış eşleşti — ağ hatası "şifreniz hatalı" olarak
 * göründü — ve o hata testle perçinlendi.
 */
export function toAuthError(message: string): AuthError {
  if (/invalid login credentials/i.test(message)) {
    return { key: "invalidCredentials" };
  }
  if (/email not confirmed/i.test(message)) {
    return { key: "emailNotConfirmed" };
  }
  if (/rate limit|too many/i.test(message)) {
    return { key: "rateLimit" };
  }
  if (/provider is not enabled/i.test(message)) {
    return { key: "providerDisabled" };
  }

  /* AĞ HATASI AYRI BİR ANAHTAR. Eskiden buraya düşen her şey
     `invalidCredentials` etiketiyle dönüyordu — yani Supabase'e hiç
     ulaşılamadığında kullanıcıya "şifreniz hatalı" deniyordu. Yanlış bilgi:
     kullanıcı doğru şifreyi tekrar tekrar dener. */
  if (/failed to fetch|networkerror|network error|load failed|fetch failed/i.test(message)) {
    return { key: "network" };
  }

  /* Tanınmayan hata: metni ancak ANLAMLIYSA geçiriyoruz. */
  return meaningful(message)
    ? { key: "unexpected", raw: message }
    : { key: "unexpected" };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return error ? { ok: false, error: toAuthError(error.message) } : { ok: true };
}

export type OAuthProvider = "google" | "apple";

/**
 * Sağlayıcı Supabase panelinde açık mı?
 *
 * NEDEN ÖN KONTROL GEREKİYOR: `signInWithOAuth` sağlayıcının açık olup
 * olmadığına bakmaz — tarayıcıyı doğrudan Supabase'in `/authorize` adresine
 * yollar. Sağlayıcı kapalıysa oradan dönen şey bir hata nesnesi değil, ham
 * bir JSON gövdesidir:
 *
 *   {"code":400,"error_code":"validation_failed",
 *    "msg":"Unsupported provider: provider is not enabled"}
 *
 * Kullanıcı supabase.co alan adında, geri dönüş yolu olmayan bir ekranda
 * kalıyordu. `/auth/v1/settings` uç noktası hangi sağlayıcıların açık
 * olduğunu herkese açık olarak söylüyor; yönlendirmeden önce ona bakıyoruz.
 */
async function isProviderEnabled(provider: OAuthProvider): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (!response.ok) return true;

    const settings: { external?: Record<string, boolean> } =
      await response.json();
    return Boolean(settings.external?.[provider]);
  } catch {
    /* Ağ hatasında akışı engellemiyoruz: kontrol bir kolaylık, kapı değil.
       Sağlayıcı gerçekten kapalıysa Supabase zaten reddedecek. */
    return true;
  }
}

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  apple: "Apple",
};

/**
 * OAuth akışını başlatır. Başarılıysa tarayıcı sağlayıcıya gider ve bu
 * fonksiyon geri dönmez; dönerse bir hata olmuştur.
 *
 * Sağlayıcının Supabase panelinde (Authentication > Providers) Client ID +
 * Secret ile etkinleştirilmiş olması gerekir.
 */
export async function signInWithProvider(
  provider: OAuthProvider,
  nextPath = "/dashboard",
): Promise<AuthResult> {
  if (!(await isProviderEnabled(provider))) {
    return {
      ok: false,
      error: {
        key: "providerDisabledDetail",
        values: { provider: PROVIDER_LABELS[provider] },
      },
    };
  }

  const supabase = createClient();

  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", nextPath);

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });

  return error ? { ok: false, error: toAuthError(error.message) } : { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
