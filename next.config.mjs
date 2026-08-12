import createNextIntlPlugin from "next-intl/plugin";

/**
 * next-intl eklentisi — Faz 19.
 *
 * Yol AÇIKÇA veriliyor: varsayılan konum `./i18n/request.ts` ya da
 * `./src/i18n/request.ts`; ikincisi bu projede zaten doğru ama açık yazmak,
 * dosya taşındığında hatanın "çeviri yok" gibi sessiz değil, derleme
 * zamanında görünür olmasını sağlıyor.
 *
 * Eklenti YALNIZCA sözlüğü ve istek yapılandırmasını bağlıyor; ROUTE
 * YAPISINA DOKUNMUYOR çünkü bu kurulumda dil öneki yok (gerekçe
 * `src/i18n/config.ts` başlığında). `src/middleware.ts` olduğu gibi duruyor.
 */
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /* `X-Powered-By: Next.js` başlığı kapalı. Saldırgana kullanılan çatıyı ve
     dolaylı olarak sürüm ailesini bedava söylemenin bir faydası yok. */
  poweredByHeader: false,

  /* Geliştirme sunucusuna yerel ağdaki cihazlardan (telefon, tablet) erişim.
     `next dev` zaten tüm arayüzleri dinliyor ama Next 15, localhost dışındaki
     bir host'tan gelen `/_next/*` isteklerini "cross origin" sayıp uyarı
     basıyor — ileriki sürümlerde engelleyecek. Yerel ağ aralığını burada
     beyaz listeye alıyoruz.

     Yalnızca `next dev` için geçerli; ÜRETİM DERLEMESİNİ ETKİLEMEZ — Vercel'de
     bu ayarın hiçbir karşılığı yok. Tek bir IP yerine aralık yazılı: router
     her yeniden başlatmada farklı bir adres verebiliyor. */
  allowedDevOrigins: ["192.168.1.*", "192.168.0.*"],
  images: {
    /* `next/image` yalnızca burada sayılan host'lardan görsel yükler; eksik
       host sessiz bir kırık görsel değil, çalışma zamanı hatası üretir.

       İki kaynak birlikte yaşıyor ve bu kalıcı:
        · Seed görselleri dış adreste (Unsplash CDN) — Faz 7'de Storage'a
          TAŞINMADI, kolonlar zaten URL tutuyor ve kaynağı önemli değil.
        · Kullanıcının yüklediği dosyalar Supabase Storage'da. */
    remotePatterns: [
      /* Demo ilan görselleri. Faz 19'a kadar `picsum.photos` kullanılıyordu;
         kategori kavramı olmadığı için bir daire ilanının kapağında kahve
         çekirdeği çıkabiliyordu. Artık elle seçilmiş, kategoriye uygun
         Unsplash kareleri — havuzlar `scripts/seed-supabase.ts` içinde.

         `i.pravatar.cc` DE KALDIRILDI: müşteri portreleri tamamen kalktı,
         arayüz baş harf gösteriyor. */
      { protocol: "https", hostname: "images.unsplash.com" },
      /* Supabase Storage — host proje referansını içerdiği için ortam
         değişkeninden türetiliyor, sabit yazılmıyor.

         DEPLOY NOTU: `NEXT_PUBLIC_SUPABASE_URL` derleme zamanında tanımlı
         olmalı (Vercel > Settings > Environment Variables). Aşağıdaki yedek
         yalnızca bu dosyanın ayrıştırılabilmesi için var; eksik değişkende
         asıl hatayı `src/lib/supabase/env.ts` fırlatıyor ve derleme zaten
         orada, anlaşılır bir mesajla duruyor.

         `/object/public/**` yolu bilinçli olarak dar: private `documents`
         bucket'ı imzalı URL ile okunuyor ve `next/image` üzerinden hiç
         geçmiyor (imza her istekte değiştiği için optimizasyon işe yaramaz). */
      {
        protocol: "https",
        hostname: new URL(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://localhost",
        ).hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
