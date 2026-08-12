"use client";

import { useFormatter } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  FileText,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { seriesColor, sparklinePath } from "@/lib/chart";
import { formatCurrencyCompact, formatNumber } from "@/lib/format";
import { formatDelta } from "@/i18n/numbers";
import { useCountUp } from "@/hooks/use-count-up";
import { Card, CardContent } from "@/components/ui/card";

/* İkon sunucudan prop olarak geçilemez (fonksiyon serialize edilemez);
   anahtarla eşleştiriyoruz. */
const ICONS: Record<string, LucideIcon> = {
  listings: Building2,
  customers: Users,
  revenue: Wallet,
  offers: FileText,
};

export type KpiCardProps = {
  icon: keyof typeof ICONS | string;
  label: string;
  value: number;
  format: "number" | "currency";
  /** Yüzde değişim; işareti renk ve oku belirler. */
  delta: number;
  /** Mini trend çizgisi verisi. */
  trend: number[];
  /** Değerin altındaki bağlam metni. */
  hint: string;
  /** `--chart-*` paletindeki sıra. */
  accent: number;
  /** Kartlar sırayla belirsin — grid'in kendi gecikmesi. */
  index?: number;
};

const SPARK_W = 76;
const SPARK_H = 28;

export function KpiCard({
  icon,
  label,
  value,
  format,
  delta,
  trend,
  hint,
  accent,
  index = 0,
}: KpiCardProps) {
  const Icon = ICONS[icon] ?? Building2;
  const color = seriesColor(accent);
  const animated = useCountUp(value);
  const intl = useFormatter();

  const display =
    format === "currency"
      ? formatCurrencyCompact(animated)
      : formatNumber(Math.round(animated));

  const up = delta >= 0;
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="hairline-top h-full overflow-hidden">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg"
                style={{
                  color,
                  backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
                }}
              >
                <Icon className="size-4" />
              </span>
              <span className="text-[12.5px] font-medium text-secondary-foreground">
                {label}
              </span>
            </div>

            <svg
              width={SPARK_W}
              height={SPARK_H}
              viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
              fill="none"
              aria-hidden
              className="shrink-0"
            >
              <motion.path
                d={sparklinePath(trend, SPARK_W, SPARK_H)}
                stroke={color}
                strokeWidth={1.75}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.75 }}
                transition={{ duration: 0.9, delay: 0.15 + index * 0.06 }}
              />
            </svg>
          </div>

          <div className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-foreground">
            {display}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium tabular-nums",
                up
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger",
              )}
            >
              <DeltaIcon className="size-3" />
              {/* Sabit `tr-TR` idi: hem ondalık ayracı hem yüzde işaretinin
                  yeri her dilde Türkçe çıkıyordu. Artı işareti de elle
                  ekleniyordu; ikisini de `Intl` çözüyor. */}
              {formatDelta(intl, delta / 100)}
            </span>
            <span className="text-[12px] text-muted-foreground">{hint}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
