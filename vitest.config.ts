import { defineConfig } from "vitest/config";

/**
 * ============================================================================
 * TEST YAPILANDIRMASI
 * ============================================================================
 * KAPSAM BİLİNÇLİ OLARAK DAR: yalnızca saf fonksiyonlar. Veritabanı, tarayıcı
 * ya da React render'ı gerektiren hiçbir şey burada değil. Gerekçe README >
 * "Test kapsamı".
 *
 * `resolve.tsconfigPaths` `@/…` takma adlarını `tsconfig.json`dan okuyor —
 * testler uygulama koduyla aynı import yollarını kullansın diye.
 *
 * `env`: `lib/supabase/env.ts` eksik ortam değişkeninde bilerek istisna
 * fırlatıyor ve `lib/storage/paths.ts` onu import ediyor. Testte gerçek bir
 * projeye bağlanmıyoruz; sahte ama biçimi doğru değerler yeterli — zaten
 * sınanan şey URL'in nasıl AYRIŞTIRILDIĞI.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test",
    },
  },
});
