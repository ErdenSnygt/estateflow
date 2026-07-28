import { describe, expect, it } from "vitest";

import {
  areaPath,
  buildTicks,
  createScale,
  donutSegments,
  linePath,
  niceMax,
  polarToCartesian,
  seriesColor,
  smoothPath,
  sparklinePath,
  toPoints,
} from "@/lib/chart";

/**
 * Grafik yardımcıları.
 *
 * Hepsi saf ve DOM'dan bağımsız — kütüphanesiz SVG üretiminin bedeli, bu
 * kenar durumlarını kendimizin karşılaması. Testlerin çoğu tam olarak o
 * kenarları hedefliyor: sıfır genişlikli domain, tek elemanlı seri, düz seri,
 * %100 tek dilim.
 */

describe("createScale", () => {
  it("domaini range'e doğrusal taşır", () => {
    const scale = createScale([0, 10], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(5)).toBe(50);
    expect(scale(10)).toBe(100);
  });

  it("ters range ile çalışır (SVG y ekseni aşağı doğru)", () => {
    const scale = createScale([0, 100], [200, 0]);
    expect(scale(0)).toBe(200);
    expect(scale(100)).toBe(0);
  });

  it("sıfır genişlikli domainde aralığın ortasına sabitlenir", () => {
    /* Tüm değerleri aynı olan bir seri (ör. altı ay boyunca 0 satış) böyle
       bir domain üretir; bölme sıfıra düşerdi. */
    const scale = createScale([5, 5], [0, 100]);
    expect(scale(5)).toBe(50);
    expect(scale(999)).toBe(50);
  });
});

describe("niceMax", () => {
  it("okunabilir bir üst sınıra yuvarlar", () => {
    expect(niceMax(47_300)).toBe(50_000);
    expect(niceMax(9)).toBe(10);
    expect(niceMax(120)).toBe(150);
  });

  it("tam yuvarlak değeri büyütmez", () => {
    expect(niceMax(100)).toBe(100);
    expect(niceMax(1000)).toBe(1000);
  });

  it("sıfır ve negatifte 1 döner", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-50)).toBe(1);
  });

  it("her zaman girdiden küçük olmayan bir değer döner", () => {
    for (const value of [1, 3, 17, 233, 4096, 99_999]) {
      expect(niceMax(value)).toBeGreaterThanOrEqual(value);
    }
  });
});

describe("buildTicks", () => {
  it("aralık sayısı + 1 kadar değer üretir", () => {
    expect(buildTicks(100, 4)).toEqual([0, 25, 50, 75, 100]);
    expect(buildTicks(100, 2)).toEqual([0, 50, 100]);
  });

  it("sıfırdan başlar ve max ile biter", () => {
    const ticks = buildTicks(500);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(500);
  });
});

describe("toPoints", () => {
  it("değerleri çizim alanına yayar", () => {
    const points = toPoints([0, 50, 100], { width: 100, height: 50, max: 100 });
    expect(points).toHaveLength(3);
    expect(points[0].x).toBe(0);
    expect(points[2].x).toBe(100);
    /* y ekseni ters: en büyük değer en yukarıda (0). */
    expect(points[0].y).toBe(50);
    expect(points[2].y).toBe(0);
  });

  it("tek elemanlı seride bölme hatası vermez", () => {
    const points = toPoints([42], { width: 100, height: 50, max: 100 });
    expect(points).toHaveLength(1);
    expect(Number.isFinite(points[0].x)).toBe(true);
    expect(Number.isFinite(points[0].y)).toBe(true);
  });

  it("boş seri boş dizi döner", () => {
    expect(toPoints([], { width: 100, height: 50, max: 10 })).toEqual([]);
  });
});

describe("path üretimi", () => {
  const points = [
    { x: 0, y: 10 },
    { x: 10, y: 20 },
    { x: 20, y: 5 },
  ];

  it("linePath M ile başlar, L ile devam eder", () => {
    expect(linePath(points)).toBe("M 0 10 L 10 20 L 20 5");
  });

  it("boş girdide boş metin döner", () => {
    expect(linePath([])).toBe("");
    expect(smoothPath([])).toBe("");
    expect(areaPath([], 100)).toBe("");
    expect(sparklinePath([], 100, 20)).toBe("");
  });

  it("smoothPath üçten az noktada düz çizgiye düşer", () => {
    const two = points.slice(0, 2);
    expect(smoothPath(two)).toBe(linePath(two));
  });

  it("smoothPath üç ve üzeri noktada eğri üretir", () => {
    expect(smoothPath(points)).toContain("C");
  });

  it("areaPath kapalı bir şekil üretir", () => {
    const path = areaPath(points, 100);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).toContain("L 20 100");
  });

  it("sparklinePath düz seride de çizgi üretir", () => {
    /* Tüm değerler eşitse min = max; yapay bant açılmasaydı path boş kalırdı. */
    const path = sparklinePath([5, 5, 5, 5], 60, 20);
    expect(path).not.toBe("");
    expect(path).toContain("M");
    expect(path).not.toContain("NaN");
  });

  it("üretilen path'lerde NaN bulunmaz", () => {
    for (const values of [[0, 0, 0], [1], [3, 1, 4, 1, 5], [-2, 7, 0]]) {
      expect(sparklinePath(values, 60, 20)).not.toContain("NaN");
    }
  });
});

describe("polarToCartesian", () => {
  it("saat 12 yönü yukarıyı gösterir", () => {
    const point = polarToCartesian(0, 0, 10, 0);
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(-10);
  });

  it("90 derece sağı gösterir", () => {
    const point = polarToCartesian(0, 0, 10, 90);
    expect(point.x).toBeCloseTo(10);
    expect(point.y).toBeCloseTo(0);
  });
});

describe("donutSegments", () => {
  const options = { cx: 50, cy: 50, radius: 40, innerRadius: 25 };

  it("her değer için bir dilim ve doğru pay üretir", () => {
    const segments = donutSegments([50, 30, 20], options);
    expect(segments).toHaveLength(3);
    expect(segments[0].share).toBeCloseTo(0.5);
    expect(segments[1].share).toBeCloseTo(0.3);
    expect(segments[2].share).toBeCloseTo(0.2);
  });

  it("payların toplamı 1'dir", () => {
    const segments = donutSegments([7, 13, 5, 1], options);
    const total = segments.reduce((sum, segment) => sum + segment.share, 0);
    expect(total).toBeCloseTo(1);
  });

  it("toplam sıfırsa boş dizi döner", () => {
    expect(donutSegments([], options)).toEqual([]);
    expect(donutSegments([0, 0], options)).toEqual([]);
  });

  it("tek dilim %100 iken tam çember çizmeye çalışmaz", () => {
    /* SVG yayı başlangıç ve bitiş aynı noktadaysa hiçbir şey çizmez; kod
       359.9 derecede kesiyor. */
    const [segment] = donutSegments([10], options);
    expect(segment.share).toBe(1);
    expect(segment.path).not.toBe("");
    expect(segment.path).toContain("A");
  });

  it("sıfır değerli dilim boş path alır ama sırayı bozmaz", () => {
    const segments = donutSegments([10, 0, 10], options);
    expect(segments).toHaveLength(3);
    expect(segments[1].path).toBe("");
    expect(segments[0].path).not.toBe("");
    expect(segments[2].path).not.toBe("");
  });

  it("path'lerde NaN bulunmaz", () => {
    for (const segment of donutSegments([3, 1, 4, 1, 5, 9], options)) {
      expect(segment.path).not.toContain("NaN");
    }
  });
});

describe("seriesColor", () => {
  it("CSS değişkeni döner, hex değil", () => {
    expect(seriesColor(0)).toContain("var(--chart-");
  });

  it("beşten fazla seride başa döner", () => {
    expect(seriesColor(5)).toBe(seriesColor(0));
    expect(seriesColor(7)).toBe(seriesColor(2));
  });
});
