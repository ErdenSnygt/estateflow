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

export type AuthResult = { ok: true } | { ok: false; error: string };

/** Supabase'in İngilizce hata mesajlarını arayüz diline çevirir. */
function toMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "E-posta veya şifre hatalı.";
  }
  if (/email not confirmed/i.test(message)) {
    return "E-posta adresiniz henüz doğrulanmamış.";
  }
  if (/rate limit|too many/i.test(message)) {
    return "Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.";
  }
  if (/provider is not enabled/i.test(message)) {
    return "Bu giriş yöntemi Supabase panelinde henüz etkinleştirilmemiş.";
  }
  return message;
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return error ? { ok: false, error: toMessage(error.message) } : { ok: true };
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
      error: `${PROVIDER_LABELS[provider]} girişi Supabase panelinde henüz etkinleştirilmemiş. Authentication > Providers altından Client ID ve Secret ile açmanız gerekiyor.`,
    };
  }

  const supabase = createClient();

  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", nextPath);

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });

  return error ? { ok: false, error: toMessage(error.message) } : { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
