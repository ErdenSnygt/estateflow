import { beforeAll, describe, expect, it, vi } from "vitest";

import type { toAuthError as ToAuthError } from "@/lib/auth/client";

/**
 * ============================================================================
 * GİRİŞ HATASI EŞLEMESİ
 * ============================================================================
 * Bu testler bir ÜRETİM HATASINDAN doğdu. Supabase projesi duraklatılmışken
 * giriş denenince ekranda tek başına `{}` yazdı. İki ayrı kusur vardı:
 *
 *  1. Tanınmayan her hata `invalidCredentials` etiketiyle dönüyordu — yani
 *     sunucuya hiç ulaşılamadığında kullanıcıya "şifreniz hatalı" deniyordu.
 *     Kullanıcı doğru şifreyi tekrar tekrar dener; yanlış bilgi, eksik
 *     bilgiden kötüdür.
 *  2. `raw` alanı Supabase'den geleni SÜZMEDEN geçiriyordu. Duraklatılmış
 *     projenin gövdesi boş bir nesneydi ve ekrana `{}` düştü.
 *
 * `lib/supabase/env.ts` modül yüklenirken ortam değişkeni istiyor; testte
 * sahte değerler veriliyor ve modül ondan SONRA yükleniyor (dinamik import).
 * Ağa çıkan bir şey yok — `toAuthError` saf.
 */

let toAuthError: typeof ToAuthError;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  ({ toAuthError } = await import("@/lib/auth/client"));
});

describe("bilinen Supabase hataları", () => {
  it("her biri kendi anahtarına eşleniyor", () => {
    expect(toAuthError("Invalid login credentials").key).toBe(
      "invalidCredentials",
    );
    expect(toAuthError("Email not confirmed").key).toBe("emailNotConfirmed");
    expect(toAuthError("Email rate limit exceeded").key).toBe("rateLimit");
    expect(toAuthError("Provider is not enabled").key).toBe("providerDisabled");
  });

  it("bilinen hatada ham metin taşınmıyor", () => {
    /* Çevirisi var; İngilizce aslını da göstermek gürültü olurdu. */
    expect(toAuthError("Invalid login credentials").raw).toBeUndefined();
  });
});

describe("ağ hatası ayrı bir anahtar", () => {
  it("fetch başarısızlıkları 'network' oluyor, 'invalidCredentials' değil", () => {
    for (const message of [
      "Failed to fetch",
      "TypeError: Failed to fetch",
      "NetworkError when attempting to fetch resource.",
      "Load failed",
      "fetch failed",
    ]) {
      expect(toAuthError(message).key, message).toBe("network");
    }
  });
});

describe("tanınmayan hata", () => {
  it("anlamsız gövde ekrana ÇIKMIYOR", () => {
    /* Ekranda `{}` gösteren asıl hata. Boş JSON, boş dizi ve boş metin
       kullanıcıya hiçbir şey anlatmıyor; çevrilmiş genel mesaj kalıyor. */
    for (const junk of ["{}", "[]", "  ", '""', "{ }", "null", "undefined"]) {
      const result = toAuthError(junk);
      expect(result.key, junk).toBe("unexpected");
      expect(result.raw, junk).toBeUndefined();
    }
  });

  it("anlamlı bir cümle ham hâliyle geçiyor", () => {
    /* `raw`ın varlık sebebi: sözlükte karşılığı olmayan ama GERÇEK bir
       cümleyi uydurma bir çeviriyle değiştirmemek. */
    const result = toAuthError("Database error querying schema");
    expect(result.key).toBe("unexpected");
    expect(result.raw).toBe("Database error querying schema");
  });

  it("JSON gövdesi içindeki gerçek mesaj da anlamlı sayılıyor", () => {
    const body = '{"message":"Signups not allowed for this instance"}';
    expect(toAuthError(body).raw).toBe(body);
  });
});
