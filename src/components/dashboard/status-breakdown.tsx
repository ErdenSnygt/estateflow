"use client";

import { motion } from "framer-motion";

import type { StatusBreakdown as StatusBreakdownItem } from "@/lib/data/listings";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/listings";

/** Rozet tonlarını çubuk zeminine çevirir — kart ile liste aynı dili konuşsun. */
const TONE_BG: Record<(typeof STATUS_TONES)[keyof typeof STATUS_TONES], string> =
  {
    success: "bg-success",
    neutral: "bg-muted-foreground",
    warning: "bg-warning",
    brand: "bg-brand",
  };

export function StatusBreakdown({ data }: { data: StatusBreakdownItem[] }) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percent = Math.round(item.share * 100);

        return (
          <div key={item.status} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] text-secondary-foreground">
                {STATUS_LABELS[item.status]}
              </span>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">{item.count}</span>{" "}
                ilan · %{percent}
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
