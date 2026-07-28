import { describe, expect, it } from "vitest";

import {
  countPerMonth,
  countWithin,
  DAY,
  monthStartUtc,
  percentChange,
} from "@/lib/data/stats";

/**
 * Ay sınırı ve trend hesapları.
 *
 * `monthStartUtc` Faz 6'da bir hata düzeltilerek doğdu: sınır ISO METNİ olarak
 * karşılaştırılıyordu ve Postgres'in `…+00:00` biçimi ile JavaScript'in
 * `…Z` biçimi ay başında tam eşitken `+` (0x2B) < `.` (0x2E) olduğu için
 * yanlış tarafa düşüyordu. Ayın ilk saniyesinde kapanan bir satış "geçen ay"
 * sayılıyordu. Aşağıdaki sınır testleri o hatanın nöbetçisi.
 */

/** 15 Temmuz 2026, 12:00 UTC. */
const JULY_15 = Date.UTC(2026, 6, 15, 12);

describe("monthStartUtc", () => {
  it("içinde bulunulan ayın ilk anını döner", () => {
    expect(monthStartUtc(JULY_15)).toBe(Date.UTC(2026, 6, 1));
  });

  it("ayın ilk anı kendi ayına aittir", () => {
    const start = Date.UTC(2026, 6, 1);
    expect(monthStartUtc(start)).toBe(start);
  });

  it("ayın son milisaniyesi hâlâ aynı aydadır", () => {
    const lastMs = Date.UTC(2026, 6, 31, 23, 59, 59, 999);
    expect(monthStartUtc(lastMs)).toBe(Date.UTC(2026, 6, 1));
  });

  it("yıl sınırında bir önceki yıla taşmaz", () => {
    expect(monthStartUtc(Date.UTC(2026, 0, 1))).toBe(Date.UTC(2026, 0, 1));
    expect(monthStartUtc(Date.UTC(2025, 11, 31, 23, 59))).toBe(
      Date.UTC(2025, 11, 1),
    );
  });

  it("artık yıl şubatını doğru sınırlar", () => {
    expect(monthStartUtc(Date.UTC(2028, 1, 29, 8))).toBe(Date.UTC(2028, 1, 1));
  });
});

describe("ay sınırı karşılaştırması — Faz 6 hatasının nöbetçisi", () => {
  it("ay başında kapanan satış BU AY sayılır", () => {
    const since = monthStartUtc(JULY_15);

    /* Postgres'in yazdığı biçim (`+00:00`) ile JS'in yazdığı biçim (`Z`)
       aynı anı gösteriyor; sayıya çevrilince eşitler. */
    const fromPostgres = "2026-07-01T00:00:00+00:00";
    const fromJavaScript = new Date(since).toISOString();

    expect(Date.parse(fromPostgres)).toBe(since);
    expect(Date.parse(fromPostgres) >= since).toBe(true);
    expect(Date.parse(fromJavaScript) >= since).toBe(true);

    /* Metin olarak karşılaştırılsaydı Postgres biçimi küçük kalırdı — hata
       tam olarak buydu. */
    expect(fromPostgres < fromJavaScript).toBe(true);
  });

  it("bir milisaniye öncesi GEÇEN AY sayılır", () => {
    const since = monthStartUtc(JULY_15);
    expect(Date.parse("2026-06-30T23:59:59.999Z") >= since).toBe(false);
  });
});

describe("percentChange", () => {
  it("artış ve azalışı yüzde olarak verir", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(100, 100)).toBe(0);
  });

  it("önceki dönem sıfırsa 0 döner", () => {
    /* Infinity kartı bozar: "%∞ artış" diye bir gösterim yok. */
    expect(percentChange(10, 0)).toBe(0);
    expect(percentChange(0, 0)).toBe(0);
  });

  it("tek ondalık basamağa yuvarlar", () => {
    expect(percentChange(1, 3)).toBe(-66.7);
    expect(percentChange(7, 3)).toBe(133.3);
  });
});

describe("countWithin", () => {
  const stamps = [100, 200, 300, 400];

  it("aralık başlangıcı dahil, bitişi hariçtir", () => {
    expect(countWithin(stamps, 200, 400)).toBe(2);
    expect(countWithin(stamps, 100, 401)).toBe(4);
  });

  it("boş aralık ve boş dizi sıfır döner", () => {
    expect(countWithin(stamps, 500, 600)).toBe(0);
    expect(countWithin([], 0, 1000)).toBe(0);
  });

  it("ters aralık sıfır döner", () => {
    expect(countWithin(stamps, 400, 100)).toBe(0);
  });
});

describe("countPerMonth", () => {
  it("istenen sayıda kova döner ve son kova epoch'un ayıdır", () => {
    const stamps = [
      Date.UTC(2026, 6, 10), // Temmuz
      Date.UTC(2026, 6, 20), // Temmuz
      Date.UTC(2026, 5, 5), // Haziran
    ];

    const result = countPerMonth(stamps, 3, JULY_15);
    expect(result).toHaveLength(3);
    expect(result).toEqual([0, 1, 2]); // Mayıs, Haziran, Temmuz
  });

  it("pencere dışındaki kayıtlar sayılmaz", () => {
    const stamps = [Date.UTC(2025, 0, 1), Date.UTC(2026, 6, 10)];
    expect(countPerMonth(stamps, 3, JULY_15)).toEqual([0, 0, 1]);
  });

  it("yıl sınırını doğru geçer", () => {
    const stamps = [Date.UTC(2025, 11, 15), Date.UTC(2026, 0, 5)];
    const result = countPerMonth(stamps, 3, Date.UTC(2026, 1, 10));
    expect(result).toEqual([1, 1, 0]); // Aralık, Ocak, Şubat
  });

  it("veri yoksa sıfır dizisi döner", () => {
    expect(countPerMonth([], 6, JULY_15)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("DAY", () => {
  it("bir günlük milisaniye", () => {
    expect(DAY).toBe(24 * 60 * 60 * 1000);
  });
});
