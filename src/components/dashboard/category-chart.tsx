"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import type { CategoryBreakdown } from "@/lib/data/listings";
import { donutSegments, seriesColor } from "@/lib/chart";
import { CATEGORY_LABELS } from "@/lib/listings";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZE = 200;
const CENTER = SIZE / 2;

export function CategoryChart({ data }: { data: CategoryBreakdown[] }) {
  const [active, setActive] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const segments = donutSegments(
    data.map((item) => item.count),
    { cx: CENTER, cy: CENTER, radius: 88, innerRadius: 58, gap: 3 },
  );

  const activeItem = active === null ? null : data[active];

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="İlan kategorisi dağılımı"
          onMouseLeave={() => setActive(null)}
        >
          {segments.map((segment, index) => (
            <motion.path
              key={data[index].category}
              d={segment.path}
              fill={seriesColor(index)}
              style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{
                opacity: active === null || active === index ? 1 : 0.35,
                scale: active === index ? 1.045 : 1,
              }}
              transition={{
                opacity: { duration: 0.35, delay: index * 0.05 },
                scale: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
              }}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              tabIndex={0}
              className="cursor-default outline-none"
            />
          ))}
        </svg>

        {/* Halkanın ortası — hover'da o dilime döner */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[22px] font-semibold leading-none tabular-nums text-foreground">
              {formatNumber(activeItem ? activeItem.count : total)}
            </p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              {activeItem ? CATEGORY_LABELS[activeItem.category] : "toplam ilan"}
            </p>
          </div>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-1">
        {data.map((item, index) => (
          <li key={item.category}>
            <button
              type="button"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                active === index ? "bg-surface-hover" : "hover:bg-surface-hover",
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seriesColor(index) }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-secondary-foreground">
                {CATEGORY_LABELS[item.category]}
              </span>
              <span className="text-[13px] font-medium tabular-nums text-foreground">
                {item.count}
              </span>
              <span className="w-10 text-right text-[12px] tabular-nums text-muted-foreground">
                %{Math.round(item.share * 100)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
