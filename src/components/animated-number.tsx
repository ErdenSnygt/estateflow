"use client";

import { useCountUp } from "@/hooks/use-count-up";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
} from "@/lib/format";

/**
 * ============================================================================
 * SAYAÇLI SAYI
 * ============================================================================
 * `useCountUp` kancasını biçimlendirmeyle birleştiren ince sarmalayıcı.
 *
 * -----------------------------------------------------------------------------
 * NEDEN VAR: KURAL TEK YERDE OLSUN
 * -----------------------------------------------------------------------------
 * Faz 15'te sayaç animasyonu YALNIZCA dashboard KPI kartlarındaydı ve kural
 * şuydu: "sayfa başına en fazla bir grup, o grup da sayfanın konusu olmalı".
 * Faz 16'da Gelirler ve Raporlar gelince o tanıma uyan üç grup daha doğdu
 * (Gelirler özet kartları, Raporlar mini istatistikleri, Profil performans
 * kutuları) ama hiçbirinde animasyon yoktu — aynı görsel öğe bir sayfada
 * canlanıp diğerinde durağan kalıyordu.
 *
 * Faz 17'de kural genişletildi ve TEK CÜMLEYE indirgendi:
 *
 *   Sayfanın MANŞET SAYILARI sayar; satır içi ve tablo sayıları saymaz.
 *
 * Manşet sayı = üstteki özet kutularında duran, sayfanın "durumu" anlatan
 * büyük rakam. Bugün dört yerde var: Dashboard KPI, Gelirler özeti, Raporlar
 * mini istatistikleri, Profil performansı.
 *
 * SAYMAYANLAR ve nedeni değişmedi: liste satırlarındaki tutarlar, m², oda
 * sayısı, rozet sayaçları. Onlar okunacak veri, karşılama efekti değil;
 * üstelik `tabular-nums` ile hizalanmış sütunlarda basamak değişimi kıpırdama
 * üretiyor.
 *
 * FİLTREYLE DEĞİŞEN MANŞETLER DE SAYIYOR. Gelirler'de dönem sekmesine
 * basıldığında sayaç yeniden koşuyor ve bu bilinçli: rakamın değiştiğini
 * gösteren en açık işaret. Faz 15'te "filtre değişiminde tekrar koşar" diye
 * dışarıda bırakılmıştı; o gerekçe LİSTE sayıları için geçerliydi (arka
 * arkaya filtre denerken sürekli oynayan bir tablo), dört büyük kutu için
 * değil.
 *
 * Hareket hassasiyeti açıksa animasyon hiç kurulmuyor — gerekçe
 * `hooks/use-count-up.ts` içinde.
 */
export function AnimatedNumber({
  value,
  format = "number",
  currencyCode,
}: {
  value: number;
  /**
   * `compact` dar kutular için ("₺12,5 Mn"), `currency` tam tutar için.
   * Hangisinin nerede kullanıldığı çağıran tarafın kararı — bu bileşen
   * yalnızca biçimlendiriciyi seçiyor.
   */
  format?: "number" | "currency" | "compact";
  currencyCode?: "TRY" | "USD" | "EUR";
}) {
  const animated = useCountUp(value);

  switch (format) {
    case "currency":
      /* Yuvarlama ŞART: animasyon ara karelerde ondalık üretiyor ve
         `formatCurrency` onu "₺249.999,73" gibi gösterirdi. */
      return <>{formatCurrency(Math.round(animated), currencyCode)}</>;
    case "compact":
      return <>{formatCurrencyCompact(animated, currencyCode)}</>;
    default:
      return <>{formatNumber(Math.round(animated))}</>;
  }
}
