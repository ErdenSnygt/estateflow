"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { greetingPeriod, type GreetingPeriod } from "@/lib/greeting";

/**
 * ============================================================================
 * SAATE GÖRE SELAMLAMA — NEDEN İSTEMCİ BİLEŞENİ
 * ============================================================================
 * "Günaydın / İyi günler / İyi akşamlar / İyi geceler" ayrımı KULLANICININ
 * saatine göre yapılmalı, sunucununkine göre değil. Vercel'de sunucu UTC'de
 * çalışıyor; Türkiye UTC+3. Sunucu saatiyle karar verilseydi akşam 20:00'de
 * ekranda "İyi günler" yazardı — üç saat şaşan bir selamlama, hiç
 * selamlamamaktan kötü.
 *
 * Yalnızca tarayıcı `new Date().getHours()` ile cihazın saatini biliyor, o da
 * ancak sayfa hidrasyondan sonra.
 *
 * -----------------------------------------------------------------------------
 * İLK ÇİZİM NEDEN YİNE DE SUNUCUDAN GELİYOR
 * -----------------------------------------------------------------------------
 * `fallbackPeriod` sunucuda hesaplanıp prop olarak iniyor ve istemcinin İLK
 * render'ı da onu kullanıyor. Böylece sunucunun ürettiği HTML ile istemcinin
 * ilk çıktısı birebir aynı oluyor — hidrasyon uyuşmazlığı YOK, dolayısıyla
 * `suppressHydrationWarning` gibi bir kapatmaya da gerek yok.
 *
 * Efekt çalıştıktan sonra dönem cihaz saatiyle yeniden hesaplanıyor. Sunucu ve
 * cihaz aynı dilime düşüyorsa hiçbir şey değişmiyor; düşmüyorsa başlık bir kez
 * güncelleniyor. Alternatifleri denendi ve daha kötüler: başlığı boş bırakmak
 * yer sıçratıyor, `suppressHydrationWarning` ise uyarıyı susturuyor ama
 * SUNUCUNUN yanlış metnini ekranda bırakıyor (React o düğümü artık kendi
 * başına düzeltmiyor).
 */
export function DashboardGreeting({
  name,
  fallbackPeriod,
}: {
  name: string;
  /** Sunucunun saatinden hesaplanan dönem; hidrasyona kadar geçerli. */
  fallbackPeriod: GreetingPeriod;
}) {
  const t = useTranslations("dashboard.greeting");
  const [period, setPeriod] = React.useState<GreetingPeriod | null>(null);

  React.useEffect(() => {
    setPeriod(greetingPeriod(new Date().getHours()));
  }, []);

  return <>{t(period ?? fallbackPeriod, { name })}</>;
}
