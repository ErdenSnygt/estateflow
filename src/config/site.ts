/** Ürün geneli sabitler. İleride tenant bazlı hale gelecek. */
export const site = {
  name: "Emlak CRM",
  shortName: "EC",
  tagline: "Gayrimenkul ekipleri için modern CRM",
} as const;

/* Faz 1-4'te burada sabit bir `currentUser` kaydı vardı; arayüzü dolduruyordu.
   Faz 5'te Supabase Auth devreye girince kaldırıldı — kullanıcı bilgisi artık
   oturumdan geliyor (`lib/auth/session.ts`, `components/layout/session-provider.tsx`). */
