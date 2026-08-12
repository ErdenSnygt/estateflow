import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { site } from "@/config/site";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Üstveri ARTIK ASENKRON: slogan çeviriye taşındı, yani dil çerezine bağlı.
 * `generateMetadata` sunucuda çalışıyor ve `getTranslations()` çerezi okuyor —
 * sekme başlığı da arayüzle aynı dilde.
 *
 * Marka ADI çevrilmiyor (`site.name`): "EstateFlow" her dilde EstateFlow.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");

  return {
    title: {
      default: `${site.name} — ${t("tagline")}`,
      template: `%s · ${site.name}`,
    },
    description: t("tagline"),
  };
}

export const viewport: Viewport = {
  themeColor: "#0B0F19",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* `lang` SABİT DEĞİL ARTIK. Ekran okuyucular telaffuzu bu özniteliğe göre
     seçiyor; İngilizce arayüzü Türkçe telaffuzla okumak, çeviriyi işlevsiz
     bırakırdı. Tarayıcının çeviri teklifi de buna bakıyor. */
  const locale = await getLocale();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Sözlük İSTEMCİYE DE GEÇİYOR: uygulamanın gezinme katmanı ("use
            client") ve `useTranslations()` orada da çalışmalı. next-intl
            varsayılan olarak yalnızca kullanılan sözlüğü seri hâle getirir;
            burada tamamı geçiyor çünkü gezinme her sayfada var ve parçalı
            geçirmek her istemci bileşenine ayrı sarmalayıcı demekti. */}
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
