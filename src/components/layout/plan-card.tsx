import { Sparkles } from "lucide-react";

/**
 * Sidebar altındaki plan/kullanım kartı.
 * Faz 1'de statik — abonelik verisi bağlandığında gerçek değerlerle dolacak.
 */
export function PlanCard() {
  const used = 128;
  const limit = 250;
  const percentage = Math.round((used / limit) * 100);

  return (
    <div className="hairline-top rounded-xl border border-hairline bg-surface/60 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-brand" />
        <span className="text-[12.5px] font-medium text-foreground">
          Pro Plan
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {used}/{limit}
        </span>
      </div>

      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-surface-active">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-violet"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Aktif ilan kotanız
      </p>
    </div>
  );
}
