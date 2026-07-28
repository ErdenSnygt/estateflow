/**
 * ============================================================================
 * GRAFİK YARDIMCILARI
 * ============================================================================
 * Harici grafik kütüphanesi YOK. Recharts/Chart.js gibi paketler bundle'a
 * 80–150 kB ekler; ihtiyacımız olan çizgi, alan ve halka dilimleri birkaç
 * saf fonksiyonla SVG path'ine dönüşebiliyor.
 *
 * Buradaki her şey saf ve DOM'dan bağımsızdır — sunucuda da çalışır, test
 * edilmesi kolaydır. Renkler CSS değişkenidir; tema değişince grafik de
 * değişir, JS'te hex tutmayız.
 */

export type Point = { x: number; y: number };

/** Seri renkleri — `globals.css` içindeki `--chart-*` token'larına bağlı. */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Beşten fazla seri olursa başa döner. */
export function seriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}

/* ==========================================================================
   Ölçekleme
   ========================================================================== */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** SVG koordinatlarını gereksiz ondalıktan arındırır — path string'i küçülür. */
const fmt = (value: number) => Math.round(value * 100) / 100;

/** Doğrusal ölçek. Domain sıfır genişlikteyse aralığın ortasına sabitlenir. */
export function createScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  if (span === 0) return () => (r0 + r1) / 2;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

/**
 * Eksen üst sınırını okunabilir bir yuvarlak değere çeker (1 / 2 / 2.5 / 5 / 10
 * adımları). 47.300 → 50.000 gibi.
 */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find(
    (candidate) => normalized <= candidate,
  );
  return (step ?? 10) * magnitude;
}

/** Eşit aralıklı eksen değerleri (`count` = aralık sayısı). */
export function buildTicks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, index) => (max / count) * index);
}

/** Değer dizisini çizim alanı koordinatlarına taşır. */
export function toPoints(
  values: readonly number[],
  options: {
    width: number;
    height: number;
    max: number;
    min?: number;
    paddingX?: number;
  },
): Point[] {
  const { width, height, max, min = 0, paddingX = 0 } = options;
  const x = createScale([0, Math.max(values.length - 1, 1)], [
    paddingX,
    width - paddingX,
  ]);
  const y = createScale([min, max], [height, 0]);
  return values.map((value, index) => ({ x: x(index), y: y(value) }));
}

/* ==========================================================================
   Path üretimi
   ========================================================================== */

/** Düz çizgi. */
export function linePath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${fmt(point.x)} ${fmt(point.y)}`,
    )
    .join(" ");
}

/**
 * Yumuşatılmış çizgi (cardinal spline). Kontrol noktaları segmentin kendi y
 * aralığına kırpılır — aksi halde eğri veri noktasının altına sarkar ve
 * "olmayan bir düşüş" gösterir.
 */
export function smoothPath(points: readonly Point[], tension = 0.2): string {
  if (points.length < 3) return linePath(points);

  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const previous = points[i - 1] ?? points[i];
    const current = points[i];
    const next = points[i + 1];
    const afterNext = points[i + 2] ?? next;

    const low = Math.min(current.y, next.y);
    const high = Math.max(current.y, next.y);

    const c1 = {
      x: current.x + (next.x - previous.x) * tension,
      y: clamp(current.y + (next.y - previous.y) * tension, low, high),
    };
    const c2 = {
      x: next.x - (afterNext.x - current.x) * tension,
      y: clamp(next.y - (afterNext.y - current.y) * tension, low, high),
    };

    d += ` C ${fmt(c1.x)} ${fmt(c1.y)}, ${fmt(c2.x)} ${fmt(c2.y)}, ${fmt(next.x)} ${fmt(next.y)}`;
  }

  return d;
}

/** Çizginin altını dolduran kapalı alan. `baseline` genelde grafiğin tabanıdır. */
export function areaPath(
  points: readonly Point[],
  baseline: number,
  smooth = true,
): string {
  if (points.length === 0) return "";
  const line = smooth ? smoothPath(points) : linePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${fmt(last.x)} ${fmt(baseline)} L ${fmt(first.x)} ${fmt(baseline)} Z`;
}

/** KPI kartlarındaki mini trend çizgisi. */
export function sparklinePath(
  values: readonly number[],
  width: number,
  height: number,
): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  /* Düz seride bile çizgi ortada dursun diye yapay bir bant açıyoruz. */
  const padding = max === min ? Math.max(Math.abs(max) * 0.1, 1) : 0;
  return smoothPath(
    toPoints(values, {
      width,
      height: height - 2,
      max: max + padding,
      min: min - padding,
      paddingX: 1,
    }).map((point) => ({ x: point.x, y: point.y + 1 })),
  );
}

/* ==========================================================================
   Halka / pasta
   ========================================================================== */

export type DonutSegment = {
  path: string;
  /** Dilimin ortasının açısı — etiket veya işaretçi konumlandırmak için. */
  midAngle: number;
  /** 0–1 arası pay. */
  share: number;
};

/** Saat 12'den başlayıp saat yönünde ilerleyen açı → kartezyen. */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDegrees: number,
): Point {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

/**
 * Halka dilimleri. `gap` derece cinsinden dilimler arası boşluktur; toplam
 * boşluk çemberi yutmasın diye dilim sayısına göre kırpılır.
 */
export function donutSegments(
  values: readonly number[],
  options: {
    cx: number;
    cy: number;
    radius: number;
    innerRadius: number;
    gap?: number;
    startAngle?: number;
  },
): DonutSegment[] {
  const { cx, cy, radius, innerRadius, gap = 2, startAngle = 0 } = options;
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  const visible = values.filter((value) => value > 0).length;
  const safeGap = visible > 1 ? Math.min(gap, 180 / visible) : 0;

  let cursor = startAngle;

  return values.map((value) => {
    const share = value / total;
    const sweep = share * 360;
    const from = cursor + safeGap / 2;
    /* Tek dilim %100 ise tam çember tek yayla çizilemez — 359.9'da bırakıyoruz. */
    const to = Math.min(cursor + sweep - safeGap / 2, cursor + 359.9);
    cursor += sweep;

    if (value <= 0 || to <= from) {
      return { path: "", midAngle: from, share };
    }

    const outerStart = polarToCartesian(cx, cy, radius, from);
    const outerEnd = polarToCartesian(cx, cy, radius, to);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, to);
    const innerStart = polarToCartesian(cx, cy, innerRadius, from);
    const largeArc = to - from > 180 ? 1 : 0;

    const path = [
      `M ${fmt(outerStart.x)} ${fmt(outerStart.y)}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${fmt(outerEnd.x)} ${fmt(outerEnd.y)}`,
      `L ${fmt(innerEnd.x)} ${fmt(innerEnd.y)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${fmt(innerStart.x)} ${fmt(innerStart.y)}`,
      "Z",
    ].join(" ");

    return { path, midAngle: (from + to) / 2, share };
  });
}
