"use client";

import { useState } from "react";

import type { RevenuePoint } from "@/lib/data/revenue";
import { areaPath, buildTicks, niceMax, smoothPath, toPoints } from "@/lib/chart";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Satış hacmi trendi.
 *
 * `SalesChart` (dashboard) ile aynı görsel dil ama VERİSİ DÖNEME BAĞLI ve
 * kaynağı farklı: dashboard sabit 12 aylık `getSalesTimeSeries`'ten,
 * burası dönem seçimine göre `getRevenueOverview`'dan besleniyor. İkinci
 * sorgu açılmıyor — aynı önbellekli satır kümesi.
 *
 * İki bileşen birleştirilmedi: dashboard'daki grafik sabit 12 ayı ve tek
 * seriyi biliyor, burası değişken kova sayısı ve ikinci bir satır sayısı
 * gösteriyor. Ortaklaştırmak, ikisini de prop'la yönetilen bir "genel
 * grafik" haline getirirdi.
 */

const W = 760;
const H = 250;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const BASELINE = H - PAD.bottom;

export function TrendChart({ data }: { data: RevenuePoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const volumes = data.map((point) => point.volume);
  const max = niceMax(Math.max(...volumes, 0));
  const ticks = buildTicks(max, 4);

  const points = toPoints(volumes, {
    width: INNER_W,
    height: INNER_H,
    max,
  }).map((point) => ({ x: point.x + PAD.left, y: point.y + PAD.top }));

  const line = smoothPath(points);
  const area = areaPath(points, BASELINE);

  const slot = INNER_W / Math.max(data.length - 1, 1);
  const activePoint = active === null ? null : points[active];
  const activeData = active === null ? null : data[active];

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="relative min-w-[560px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Dönem içindeki satış hacmi"
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => {
            const y = PAD.top + INNER_H - (tick / max) * INNER_H;
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[var(--text-muted)] text-[11px] tabular-nums"
                >
                  {formatCurrencyCompact(tick)}
                </text>
              </g>
            );
          })}

          <path d={area} fill="url(#trend-area)" />
          <path
            d={line}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={PAD.top}
                y2={BASELINE}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={4.5}
                fill="var(--chart-1)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            </>
          )}

          {/* İsabet alanları + eksen etiketleri */}
          {data.map((point, index) => (
            <g key={point.month}>
              <rect
                x={PAD.left + slot * index - slot / 2}
                y={PAD.top}
                width={slot}
                height={INNER_H}
                fill="transparent"
                onMouseEnter={() => setActive(index)}
              />
              <text
                x={PAD.left + slot * index}
                y={H - 8}
                textAnchor="middle"
                className={cn(
                  "text-[11px] tabular-nums transition-colors",
                  active === index
                    ? "fill-[var(--text)]"
                    : "fill-[var(--text-muted)]",
                )}
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>

        {activeData && (
          <div
            className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-hairline bg-surface px-3 py-2 shadow-md"
            role="status"
          >
            <p className="text-[11.5px] text-muted-foreground">
              {activeData.label}
            </p>
            <p className="mt-0.5 text-[13px] font-medium tabular-nums text-foreground">
              {formatCurrency(activeData.volume)}
            </p>
            <p className="text-[12px] tabular-nums text-muted-foreground">
              {activeData.count} kapanan işlem
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
