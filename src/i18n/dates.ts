import type { useFormatter } from "next-intl";

/**
 * ============================================================================
 * DİL BİLEN TARİH BİÇİMLENDİRME
 * ============================================================================
 * `lib/format.ts` içindeki `formatDate` / `formatShortDate` SENKRON ve sabit
 * `tr-TR` kullanıyor — o dosyanın başlığında yazdığı gibi, aktif dili kendisi
 * okuyamıyor (sunucuda `getLocale()` asenkron, istemcide `useLocale()` bir
 * kanca). Sonuç: İngilizce arayüzde "23 Mart 2026" yazan bir tarih.
 *
 * Doğru araç next-intl'in biçimlendiricisi. Ama onu çağrı yerine tek başına
 * bırakmak iki şeyi tekrar ettiriyordu:
 *
 *  · BOŞ DEĞER. `published_at` ve `last_contact_at` null olabiliyor ve
 *    ekranda "—" gösteriliyor. `format.dateTime(new Date(null))` ise
 *    "Invalid Date" basar. Bu kontrol on iki modülde tekrarlanacaktı.
 *
 *  · BİÇİM ADI. `"short"` / `"long"` adları `i18n/request.ts` içinde tanımlı;
 *    burada tip düzeyinde daraltılıyor ki yanlış ad derlemede yakalansın.
 *
 * KULLANIM — sunucu bileşeni:
 *   const format = await getFormatter();
 *   formatDate(format, listing.published_at);
 *
 * KULLANIM — istemci bileşeni:
 *   const format = useFormatter();
 *   formatDate(format, note.created_at, "short");
 */

/**
 * `useFormatter()` ve `getFormatter()` aynı nesneyi döndürüyor ama next-intl
 * bu nesnenin tipini bir adla dışa aktarmıyor; kancadan türetiyoruz.
 * `import type` olduğu için bu satır derlemede siliniyor — sunucu bileşeni
 * dosyaları istemci girişini paketlemiş olmuyor.
 */
export type Formatter = ReturnType<typeof useFormatter>;

/** Değeri olmayan tarihlerin ekrandaki karşılığı — `lib/format.ts` ile aynı. */
export const EMPTY_DATE = "—";

/**
 * 31 Temmuz 2026 · July 31, 2026
 *
 * Biçim adları `i18n/request.ts` içindeki `formats.dateTime` ile aynı;
 * alan seçimi orada, SIRALAMA `Intl`'de. Yani İngilizce'de gün/ay yerinin
 * değişmesi için burada hiçbir şey yapılmıyor.
 */
export function formatDate(
  format: Formatter,
  value: string | null | undefined,
  style: "short" | "long" | "dayShort" = "long",
) {
  if (!value) return EMPTY_DATE;
  return format.dateTime(new Date(value), style);
}

/**
 * "2026-04" → "Nis" · "Apr"
 *
 * Gelir ve satış grafiklerinin ekseni. Veri katmanı (`lib/data/revenue.ts`)
 * bu anahtarı üretiyor ve Faz 25'e kadar yanına sabit Türkçe bir kısaltma
 * koyuyordu; artık ay adını burası veriyor.
 *
 * AYIN BİRİ, UTC GECE YARISI seçiliyor. `lib/calendar.ts` içindeki aynı
 * gerekçe geçerli: Europe/Istanbul her zaman UTC'nin ilerisinde, yani gün
 * geriye kaymıyor ve ay adı şaşmıyor. Amerika saat dilimlerinde bu tutmazdı.
 */
export function formatMonthKey(format: Formatter, month: string) {
  return format.dateTime(new Date(`${month}-01T00:00:00Z`), "monthShort");
}

/**
 * "3 dakika önce" · "3 minutes ago" · "12 Tem 2026"
 *
 * `lib/format.ts` içindeki `formatRelativeTime`in dil bilen karşılığı ve
 * DAVRANIŞI birebir aynı: yedi günden eskiyse göreli ifade bırakılıp kısa
 * tarihe düşülüyor. next-intl'in `relativeTime`ı kendi başına o eşiği
 * bilmiyor — "2 months ago" derdi, oysa bir iş notunun tam tarihi o
 * mesafede daha kullanışlı.
 *
 * `reference` yine ZORUNLU: varsayılan olsaydı istemci bileşeni onu render
 * sırasında okur, sunucudaki değerden şaşar ve hydration uyuşmazlığı
 * üretirdi. Gerekçenin tamamı `lib/format.ts` içinde.
 */
export function formatRelative(
  format: Formatter,
  value: string,
  reference: number,
) {
  const days = Math.abs(Date.parse(value) - reference) / 86_400_000;
  if (days >= 7) return format.dateTime(new Date(value), "short");
  return format.relativeTime(new Date(value), reference);
}
