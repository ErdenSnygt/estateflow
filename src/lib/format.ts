import type { Currency } from "@/types/database";

/**
 * ============================================================================
 * BİÇİMLENDİRİCİLER
 * ============================================================================
 * Locale ve saat dilimi AÇIKÇA verilir. Sunucu ile tarayıcı farklı bölge
 * ayarı çözerse hydration uyuşmazlığı doğar — `Intl` çağrılarında varsayılana
 * asla güvenmeyin.
 *
 * -----------------------------------------------------------------------------
 * FAZ 19: NEDEN BU DOSYA `tr-TR`'DE KALDI
 * -----------------------------------------------------------------------------
 * Arayüz iki dilli ama buradaki `LOCALE` sabiti DEĞİŞMEDİ ve bu bir eksiklik
 * değil, bir karar. İkiye ayrılıyor:
 *
 *  · PARA VE SAYI → `tr-TR` KALIYOR. Tutar Türk Lirası ve sözleşmede, tapuda,
 *    ilan portalında hep "18.450.000" yazıyor. İngilizce arayüzde
 *    "18,450,000" göstermek aynı sayının iki farklı yazımını üretir; Türkiye'de
 *    nokta binlik ayracı olduğu için bu bir OKUMA HATASI riski — kullanıcı 18
 *    milyonu 18 bin sanabilir. Para, arayüz metninden çok VERİYE yakın:
 *    seed'deki ilan başlıkları gibi çevrilmiyor.
 *
 *  · TARİH → BU DOSYADAN ÇIKTI. Ay adları ve gün/ay sırası dilin parçası; bu
 *    fonksiyonlar ise SENKRON ve hem sunucu hem istemciden çağrılıyordu, yani
 *    aktif dili kendileri okuyamıyordu (sunucuda `getLocale()` asenkron,
 *    istemcide `useLocale()` bir kanca). Faz 19–25 boyunca modül modül
 *    `i18n/dates.ts`e taşındılar ve son tur bitince `formatDate`,
 *    `formatShortDate`, `formatRelativeTime` buradan SİLİNDİ — çağıranı
 *    kalmamıştı ve duran bir kopya, yeni bir sayfanın yanlışlıkla sabit
 *    Türkçe tarih üretmesine davetiye olurdu.
 *
 * Geriye kalan her şey (para, sayı, alan) tanım gereği dilden bağımsız.
 */

const LOCALE = "tr-TR";

const currencyFormatters: Record<Currency, Intl.NumberFormat> = {
  TRY: new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }),
  EUR: new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }),
};

const compactCurrencyFormatters: Record<Currency, Intl.NumberFormat> = {
  TRY: new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "TRY",
    notation: "compact",
    maximumFractionDigits: 1,
  }),
  USD: new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }),
  EUR: new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }),
};

const numberFormatter = new Intl.NumberFormat(LOCALE);

const compactNumberFormatter = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** ₺12.450.000 */
export function formatCurrency(value: number, currency: Currency = "TRY") {
  return currencyFormatters[currency].format(value);
}

/** ₺12,5 Mn — kart ve rozet gibi dar alanlar için. */
export function formatCurrencyCompact(
  value: number,
  currency: Currency = "TRY",
) {
  return compactCurrencyFormatters[currency].format(value);
}

/** 1.248 */
export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

/** 1,2 B */
export function formatNumberCompact(value: number) {
  return compactNumberFormatter.format(value);
}

/** 145 m² */
export function formatArea(value: number) {
  return `${numberFormatter.format(value)} m²`;
}
