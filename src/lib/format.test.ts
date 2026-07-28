import { describe, expect, it } from "vitest";

import {
  formatArea,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatNumber,
  formatNumberCompact,
  formatRelativeTime,
  formatShortDate,
} from "@/lib/format";

/**
 * Biçimlendiriciler.
 *
 * Bu testlerin asıl derdi çıktının tam metni değil, İKİ DAVRANIŞ:
 *
 *  1. Locale ve saat dilimi AÇIKÇA veriliyor mu — `Intl` varsayılana
 *     bırakılırsa sunucu (UTC) ile tarayıcı (Europe/Istanbul) farklı sonuç
 *     üretir ve hydration uyuşmazlığı doğar.
 *  2. `formatRelativeTime` referans anını parametre olarak alıyor mu —
 *     varsayılan olsaydı aynı hydration sorunu buradan girerdi.
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

describe("tarih biçimlendirme", () => {
  /* 20 Temmuz 2026, 09:00 UTC → Europe/Istanbul'da 12:00, aynı gün. */
  const iso = "2026-07-20T09:00:00Z";

  it("uzun biçim gün-ay-yıl verir", () => {
    expect(formatDate(iso)).toBe("20 Temmuz 2026");
  });

  it("kısa biçim ayı kısaltır", () => {
    expect(formatShortDate(iso)).toContain("2026");
    expect(formatShortDate(iso)).toContain("20");
  });

  it("null tarihi tire gösterir", () => {
    /* `last_contact_at` null olabiliyor; "Invalid Date" basmak yerine. */
    expect(formatDate(null)).toBe("—");
    expect(formatShortDate(null)).toBe("—");
  });

  it("saat dilimi sabittir — gün kayması yaşanmaz", () => {
    /* UTC'de 21:00, İstanbul'da ertesi gün 00:00. Biçimlendirici
       Europe/Istanbul'a sabitli olduğu için 21 Temmuz demeli. */
    expect(formatDate("2026-07-20T21:00:00Z")).toBe("21 Temmuz 2026");
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-07-20T12:00:00Z");

  it("bir dakikadan yeni olayları 'az önce' der", () => {
    expect(formatRelativeTime("2026-07-20T11:59:40Z", now)).toBe("az önce");
  });

  it("dakika, saat ve gün ölçeklerini seçer", () => {
    expect(formatRelativeTime("2026-07-20T11:45:00Z", now)).toContain("dakika");
    expect(formatRelativeTime("2026-07-20T09:00:00Z", now)).toContain("saat");
    expect(formatRelativeTime("2026-07-18T12:00:00Z", now)).toBeTruthy();
  });

  it("bir haftadan eskiyse mutlak tarihe döner", () => {
    const result = formatRelativeTime("2026-06-12T12:00:00Z", now);
    expect(result).toContain("2026");
    expect(result).not.toContain("önce");
  });

  it("referans anı zorunludur — aynı girdi, farklı referans, farklı sonuç", () => {
    /* İmzadaki `reference` parametresi hydration güvenliği için var; testin
       koruduğu şey parametrenin varlığının anlamlı olması. */
    const value = "2026-07-20T11:00:00Z";
    const early = formatRelativeTime(value, Date.parse("2026-07-20T11:05:00Z"));
    const late = formatRelativeTime(value, Date.parse("2026-07-20T18:00:00Z"));
    expect(early).not.toBe(late);
  });
});
