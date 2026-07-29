"use client";

import { useState } from "react";

import type { RevenuePoint } from "@/lib/data/revenue";
import { buildTicks, niceMax } from "@/lib/chart";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Aylık komisyon grafiği — İKİ SERİLİ SÜTUN.
 *
 * -----------------------------------------------------------------------------
 * NEDEN SÜTUN, `SalesChart` GİBİ ALAN DEĞİL
 * -----------------------------------------------------------------------------
 * Satış grafiği tek bir büyüklüğün zaman içindeki AKIŞINI gösteriyor; alan
 * grafiği orada doğru. Burada iki büyüklük var ve aralarındaki ilişki asıl
 * bilgi: toplam komisyonun ne kadarı tahsil edildi. İç içe iki sütun bunu tek
 * bakışta veriyor — üst üste binen iki alan ise hangisinin hangisi olduğunu
 * belirsizleştirirdi.
 *
 * Kütüphane yok: `lib/chart.ts` ölçek ve tick yardımcıları + düz SVG,
 * `SalesChart` ve `CategoryChart` ile aynı yaklaşım.
 */

const W = 760;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 30, left: 62 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const BASELINE = PAD.top + INNER_H;

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const max = niceMax(Math.max(...data.map((point) => point.commission), 0));
  const ticks = buildTicks(max, 4);

  /* Sütun genişliği kova sayısına göre: 2 aylık dönemde geniş, 13 aylıkta
     dar. `toPoints` yerine elle hesap — sütun konumu nokta konumundan
     farklı (aralığın ortası, ucu değil). */
  const slot = INNER_W / data.length;
  const barWidth = Math.min(46, slot * 0.62);

  const activeData = active === null ? null : data[active];

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="relative min-w-[560px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Aylık komisyon geliri ve tahsilat"
          onMouseLeave={() => setActive(null)}
        >
          {/* Izgara + y ekseni */}
          {ticks.map((tick) => {
            const y = BASELINE - (tick / max) * INNER_H;
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

          {data.map((point, index) => {
            const centerX = PAD.left + slot * index + slot / 2;
            const totalHeight = max > 0 ? (point.commission / max) * INNER_H : 0;
            const collectedHeight =
              max > 0 ? (point.collected / max) * INNER_H : 0;
            const isActive = active === index;

            return (
              <g
                key={point.month}
                onMouseEnter={() => setActive(index)}
                className="cursor-default"
              >
                {/* Görünmez isabet alanı: ince sütunlarda fare hedefi
                    büyütülüyor, aksi halde tooltip zor yakalanıyor. */}
                <rect
                  x={PAD.left + slot * index}
                  y={PAD.top}
                  width={slot}
                  height={INNER_H}
                  fill="transparent"
                />

                {/* Toplam komisyon */}
                <rect
                  x={centerX - barWidth / 2}
                  y={BASELINE - totalHeight}
                  width={barWidth}
                  height={Math.max(totalHeight, 0)}
                  rx={4}
                  fill="var(--chart-1)"
                  opacity={isActive ? 0.45 : 0.28}
                  className="transition-opacity"
                />

                {/* Tahsil edilen — toplamın İÇİNDE, daha dar ve dolu. */}
                <rect
                  x={centerX - barWidth / 4}
                  y={BASELINE - collectedHeight}
                  width={barWidth / 2}
                  height={Math.max(collectedHeight, 0)}
                  rx={3}
                  fill="var(--chart-3)"
                  opacity={isActive ? 1 : 0.85}
                  className="transition-opacity"
                />

                <text
                  x={centerX}
                  y={H - 10}
                  textAnchor="middle"
                  className={cn(
                    "text-[11px] tabular-nums transition-colors",
                    isActive
                      ? "fill-[var(--text)]"
                      : "fill-[var(--text-muted)]",
                  )}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip — SVG dışında, normal DOM: metin ölçeklenmesin. */}
        {activeData && (
          <div
            className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-hairline bg-surface px-3 py-2 shadow-md"
            role="status"
          >
            <p className="text-[11.5px] text-muted-foreground">
              {activeData.label}
            </p>
            <p className="mt-0.5 text-[13px] font-medium tabular-nums text-foreground">
              {formatCurrency(activeData.commission)} komisyon
            </p>
            <p className="text-[12px] tabular-nums text-success">
              {formatCurrency(activeData.collected)} tahsil edildi
            </p>
          </div>
        )}
      </div>

      {/* Gösterge */}
      <div className="mt-3 flex flex-wrap items-center gap-4 px-1">
        <LegendItem color="var(--chart-1)" label="Toplam komisyon" faded />
        <LegendItem color="var(--chart-3)" label="Tahsil edilen" />
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  faded = false,
}: {
  color: string;
  label: string;
  faded?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <span
        aria-hidden
        className="size-2.5 rounded-sm"
        style={{ backgroundColor: color, opacity: faded ? 0.35 : 1 }}
      />
      {label}
    </span>
  );
}
