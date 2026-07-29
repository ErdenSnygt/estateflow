import { Award, Lock } from "lucide-react";

import type { Badge as BadgeType } from "@/lib/badges";
import { earnedCount } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Rozet ızgarası.
 *
 * KAZANILMAYANLAR DA GÖSTERİLİYOR, soluk halde ve ilerlemeleriyle. Yalnızca
 * kazanılanları göstermek listeyi boş bir kutuya çevirirdi (yeni personelde
 * hiçbiri yok) ve neyin mümkün olduğunu da gizlerdi. Soluk rozet aynı zamanda
 * bir hedef.
 *
 * Rozetler SAKLANMIYOR, mevcut veriden hesaplanıyor — gerekçe `lib/badges.ts`
 * başlığında.
 */
export function AgentBadges({ badges }: { badges: BadgeType[] }) {
  const earned = earnedCount(badges);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <Award className="size-4 text-muted-foreground" />
            Rozetler
          </h3>
          <span className="text-[12.5px] tabular-nums text-muted-foreground">
            {earned} / {badges.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {badges.map((badge) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center transition-colors",
                    badge.earned
                      ? "border-brand/35 bg-brand-soft"
                      : "border-hairline bg-surface-inset",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full",
                      badge.earned
                        ? "bg-brand text-brand-foreground"
                        : "bg-surface text-muted-foreground",
                    )}
                  >
                    {badge.earned ? (
                      <Award className="size-4" />
                    ) : (
                      <Lock className="size-3.5" />
                    )}
                  </span>

                  <span
                    className={cn(
                      "text-[12px] font-medium leading-tight",
                      badge.earned ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {badge.label}
                  </span>

                  {badge.progress && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {badge.progress}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>{badge.description}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Rozetler ayrı bir yerde saklanmaz; ilan, müşteri ve satış
          kayıtlarınızdan anlık hesaplanır.
        </p>
      </CardContent>
    </Card>
  );
}
