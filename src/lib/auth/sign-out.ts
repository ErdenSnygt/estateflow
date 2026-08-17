"use client";

/**
 * ============================================================================
 * ÇIKIŞ — SUPABASE'İ GEÇ YÜKLEYEN TEK FONKSİYON
 * ============================================================================
 * Faz 26 (performans). Bu fonksiyon `lib/auth/client.ts` içindeydi ve oradan
 * çıkarıldı; sebebi tek satırlık bir import zinciriydi:
 *
 *   navbar.tsx → lib/auth/client.ts → lib/supabase/client.ts → supabase-js
 *
 * Navbar uygulama kabuğunun içinde, yani GİRİŞ YAPMIŞ HER SAYFADA çiziliyor.
 * `lib/auth/client.ts` giriş fonksiyonları için supabase-js'i STATİK olarak
 * import ettiğinden, sadece "Çıkış yap" düğmesi uğruna kütüphanenin tamamı
 * (~51 kB gzip) her sayfanın ilk yükünde iniyordu.
 *
 * Burada import DİNAMİK ve fonksiyonun İÇİNDE: modül grafiğinde ayrı bir
 * parçaya (chunk) düşüyor ve ancak kullanıcı çıkışa bastığında indiriliyor.
 * Bedeli tek bir istek — çıkış zaten sayfa değiştiren, seyrek bir eylem.
 *
 * Giriş ekranı bu ayrımın dışında: `login-form.tsx` supabase-js'i zaten
 * doğrudan kullanıyor ve orada gecikmeli yükleme bir şey kazandırmaz.
 */
export async function signOut(): Promise<void> {
  const { createClient } = await import("@/lib/supabase/client");
  await createClient().auth.signOut();
}
