/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Geliştirme sunucusuna yerel ağdaki cihazlardan (telefon, tablet) erişim.
     `next dev` zaten tüm arayüzleri dinliyor ama Next 15, localhost dışındaki
     bir host'tan gelen `/_next/*` isteklerini "cross origin" sayıp uyarı
     basıyor — ileriki sürümlerde engelleyecek. Yerel ağ aralığını burada
     beyaz listeye alıyoruz.

     Yalnızca `next dev` için geçerli; üretim derlemesini etkilemez. */
  allowedDevOrigins: ["192.168.1.38", "192.168.1.*"],
  images: {
    /* `next/image` yalnızca burada sayılan host'lardan görsel yükler; eksik
       host sessiz bir kırık görsel değil, çalışma zamanı hatası üretir.

       İki kaynak birlikte yaşıyor ve bu kalıcı:
        · Seed görselleri dış adreslerde (picsum / pravatar) — Faz 7'de Storage'a
          TAŞINMADI, kolonlar zaten URL tutuyor ve kaynağı önemli değil.
        · Kullanıcının yüklediği dosyalar Supabase Storage'da. */
    remotePatterns: [
      // Demo ilan görselleri
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // Demo müşteri portreleri
      { protocol: "https", hostname: "i.pravatar.cc" },
      /* Supabase Storage — host proje referansını içerdiği için ortam
         değişkeninden türetiliyor, sabit yazılmıyor. */
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

export default nextConfig;
