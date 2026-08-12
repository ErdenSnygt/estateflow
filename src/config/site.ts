/** Ürün geneli sabitler. İleride tenant bazlı hale gelecek. */
export const site = {
  name: "EstateFlow",
  shortName: "EF",
  /* `tagline` KALKTI (Faz 25): tek okuyucusu `app/layout.tsx` idi ve o da
     Faz 19'da `common.tagline` anahtarına geçmişti. Duran kopya, yeni bir
     yerin yanlışlıkla çevrilmemiş metni almasına davetiyeydi. */
} as const;

/* Faz 1-4'te burada sabit bir `currentUser` kaydı vardı; arayüzü dolduruyordu.
   Faz 5'te Supabase Auth devreye girince kaldırıldı — kullanıcı bilgisi artık
   oturumdan geliyor (`lib/auth/session.ts`, `components/layout/session-provider.tsx`). */
