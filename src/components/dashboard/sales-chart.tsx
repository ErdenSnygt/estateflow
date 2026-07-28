"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import type { SalesPoint } from "@/lib/data/sales";
import { areaPath, buildTicks, niceMax, smoothPath, toPoints } from "@/lib/chart";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Sabit viewBox + genişliğe uyan SVG: ölçek düzgün (stroke da büyür) ve
   ölçüm için layout effect'e gerek kalmaz. */
const W = 760;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 62 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const BASELINE = H - PAD.bottom;

export function SalesChart({ data }: { data: SalesPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const revenues = data.map((point) => point.revenue);
  const max = niceMax(Math.max(...revenues));
  const ticks = buildTicks(max, 4);

  const points = toPoints(revenues, {
    width: INNER_W,
    height: INNER_H,
    max,
  }).map((point) => ({ x: point.x + PAD.left, y: point.y + PAD.top }));

  const line = smoothPath(points);
  const area = areaPath(points, BASELINE);

  const slot = INNER_W / Math.max(data.length - 1, 1);
  const activePoint = active === null ? null : points[active];
  const activeData = active === null ? null : data[active];

  /* Dar ekranda grafik kendi içinde kayar: viewBox'ı 375px'e sıkıştırınca
     11px'lik eksen yazıları 5px'e iniyor ve okunmaz oluyordu. Kaydırma
     sayfada değil, bu kutunun içinde kalır. */
  return (
    <div className="relative w-full overflow-x-auto">
      <div className="relative min-w-[580px]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Son 12 ayın satış cirosu"
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Yatay ızgara + y ekseni */}
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
                x={PAD.left - 12}
                y={y + 4}
                textAnchor="end"
                className="fill-[var(--text-muted)] text-[11px] tabular-nums"
              >
                {tick === 0 ? "0" : formatCurrencyCompact(tick)}
              </text>
            </g>
          );
        })}

        <motion.path
          d={area}
          fill="url(#sales-area)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.45 }}
        />

        <motion.path
          d={line}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Ay etiketleri */}
        {data.map((point, index) => (
          <text
            key={point.month}
            x={points[index].x}
            y={H - 8}
            textAnchor="middle"
            className={cn(
              "text-[11px]",
              active === index
                ? "fill-[var(--text)]"
                : "fill-[var(--text-muted)]",
            )}
          >
            {point.label}
          </text>
        ))}

        {/* Aktif nokta göstergesi */}
        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={PAD.top}
              y2={BASELINE}
              stroke="var(--chart-1)"
              strokeOpacity={0.35}
              strokeDasharray="3 3"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={9}
              fill="var(--chart-1)"
              fillOpacity={0.18}
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={4}
              fill="var(--chart-1)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </g>
        )}

        {/* Şeffaf hover şeritleri — her ay için bir yakalama alanı */}
        {data.map((point, index) => (
          <rect
            key={`hit-${point.month}`}
            x={points[index].x - slot / 2}
            y={PAD.top}
            width={slot}
            height={INNER_H}
            fill="transparent"
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            tabIndex={0}
            role="button"
            aria-label={`${point.fullLabel}: ${formatCurrency(point.revenue)}`}
            className="cursor-default outline-none"
          />
        ))}
      </svg>

      {/* Tooltip — SVG düzgün ölçeklendiği için yüzdeyle konumlanabilir */}
      {activePoint && activeData && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)]"
          style={{
            left: `${(activePoint.x / W) * 100}%`,
            top: `${(activePoint.y / H) * 100}%`,
          }}
        >
          <div className="glass min-w-[148px] rounded-lg px-3 py-2 shadow-md">
            <p className="text-[11.5px] font-medium text-muted-foreground">
              {activeData.fullLabel}
            </p>
            <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-foreground">
              {formatCurrency(activeData.revenue)}
            </p>
            <p className="text-[11.5px] text-secondary-foreground">
              {activeData.sales} satış kapandı
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
