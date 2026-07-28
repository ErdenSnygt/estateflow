import type { Currency } from "@/types/database";

/**
 * Biçimlendiriciler tek noktada tutulur; locale ve saat dilimi AÇIKÇA verilir.
 * Sunucu ile tarayıcı farklı bölge ayarı çözerse hydration uyuşmazlığı doğar —
 * `Intl` çağrılarında varsayılana asla güvenmeyin.
 */

const LOCALE = "tr-TR";
const TIME_ZONE = "Europe/Istanbul";

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

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
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

/** 20 Temmuz 2026 */
export function formatDate(value: string | null) {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

/** 20 Tem 2026 */
export function formatShortDate(value: string | null) {
  if (!value) return "—";
  return shortDateFormatter.format(new Date(value));
}

/** 145 m² */
export function formatArea(value: number) {
  return `${numberFormatter.format(value)} m²`;
}

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, {
  numeric: "auto",
});

/**
 * "3 dakika önce" · "dün" · "12 Tem 2026"
 *
 * `reference` zorunludur ve bilinçlidir. Faz 5'e kadar sebebi mock verinin
 * sabit bir ana göre üretilmesiydi; artık veri gerçek ve çağıranlar buraya
 * `Date.now()` geçiriyor. Parametre yine de kalıyor: varsayılan olsaydı bir
 * istemci bileşeni onu render sırasında okur, sunucudaki değerden şaşar ve
 * hydration uyuşmazlığı üretirdi. Zaman kaynağını çağıran seçsin.
 */
export function formatRelativeTime(value: string, reference: number) {
  const diffMs = Date.parse(value) - reference;
  const minutes = Math.round(diffMs / 60_000);

  if (Math.abs(minutes) < 1) return "az önce";
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relativeFormatter.format(days, "day");

  return shortDateFormatter.format(new Date(value));
}
