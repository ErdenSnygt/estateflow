import { describe, expect, it } from "vitest";

import {
  formatArea,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatNumberCompact,
} from "@/lib/format";

/**
 * Biçimlendiriciler.
 *
 * Bu testlerin asıl derdi çıktının tam metni değil, İKİ DAVRANIŞ:
 *
 *  1. Locale AÇIKÇA veriliyor mu — `Intl` varsayılana bırakılırsa sunucu ile
 *     tarayıcı farklı sonuç üretir ve hydration uyuşmazlığı doğar.
 *  2. Para ve sayı `tr-TR`de KALIYOR (gerekçe `lib/format.ts` başlığında).
 *
 * TARİH TESTLERİ BURADA DEĞİL: Faz 25'te `formatDate`, `formatShortDate` ve
 * `formatRelativeTime` bu dosyadan silindi, karşılıkları `i18n/dates.test.ts`
 * içinde ve orada iki dilde birden sınanıyor.
 *
 * Not: `Intl` çıktısındaki boşluk karakteri ortama göre normal boşluk ya da
 * bölünemez boşluk (U+00A0) olabiliyor; testler tam eşitlik yerine parça
 * kontrolü yapıyor.
 */

describe("para biçimlendirme", () => {
  it("binlik ayracı nokta, simge ₺", () => {
    const result = formatCurrency(12_450_000);
    expect(result).toContain("12.450.000");
    expect(result).toContain("₺");
  });

  it("kuruş göstermez", () => {
    expect(formatCurrency(1_500_000)).not.toContain(",");
  });

  it("para birimi seçilebilir", () => {
    expect(formatCurrency(1000, "USD")).toContain("$");
    expect(formatCurrency(1000, "EUR")).toContain("€");
  });

  it("kompakt biçim dar alanlar için kısaltır", () => {
    const result = formatCurrencyCompact(12_450_000);
    expect(result).toContain("₺");
    /* "12,5 Mn" — tam metin Intl sürümüne göre değişebilir, uzunluk sınırı
       kompaktlığın kanıtı. */
    expect(result.length).toBeLessThan(12);
  });

  it("sıfır ve negatif değerlerde çökmez", () => {
    expect(formatCurrency(0)).toContain("0");
    expect(formatCurrency(-5000)).toContain("5.000");
  });
});

describe("sayı biçimlendirme", () => {
  it("Türkçe binlik ayracı kullanır", () => {
    expect(formatNumber(1248)).toBe("1.248");
    expect(formatNumber(1_000_000)).toBe("1.000.000");
  });

  it("kompakt sayı kısaltır", () => {
    expect(formatNumberCompact(1200).length).toBeLessThan(7);
  });

  it("alan m² ile biter", () => {
    expect(formatArea(145)).toBe("145 m²");
    expect(formatArea(1500)).toBe("1.500 m²");
  });
});
