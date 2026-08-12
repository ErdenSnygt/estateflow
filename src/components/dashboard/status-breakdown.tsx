"use client";

import { useFormatter, useTranslations } from "next-intl";
import { motion } from "framer-motion";

import type { StatusBreakdown as StatusBreakdownItem } from "@/lib/data/listings";
import { STATUS_TONES } from "@/lib/listings";
import { formatPercent } from "@/i18n/numbers";

/** Rozet tonlarını çubuk zeminine çevirir — kart ile liste aynı dili konuşsun. */
const TONE_BG: Record<(typeof STATUS_TONES)[keyof typeof STATUS_TONES], string> =
  {
    success: "bg-success",
    neutral: "bg-muted-foreground",
    warning: "bg-warning",
    brand: "bg-brand",
  };

export function StatusBreakdown({ data }: { data: StatusBreakdownItem[] }) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percent = formatPercent(format, item.share);

        return (
          <div key={item.status} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] text-secondary-foreground">
                {t(`listings.status.${item.status}`)}
              </span>
              {/* Yüzde işaretini `Intl` koyuyor (Türkçe'de sayının önünde,
                  İngilizce'de arkasında); sözlükte yalnızca `{percent}` var.
                  Gerekçe `i18n/numbers.ts` başlığında. */}
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {t("dashboard.portfolio.statusShare", {
                  count: item.count,
                  percent,
                })}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
              <motion.div
                className={`h-full rounded-full ${TONE_BG[STATUS_TONES[item.status]]}`}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{
                  duration: 0.7,
                  delay: 0.1 + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
