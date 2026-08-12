import { getFormatter, getTranslations } from "next-intl/server";
import { Building2, Coins, TrendingUp, Users } from "lucide-react";

import type { AgentPerformance } from "@/lib/data/agents";
import { formatRate } from "@/i18n/numbers";
import { AnimatedNumber } from "@/components/animated-number";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Performans özeti — dört kutu.
 *
 * `/profil` ve `/personeller/[id]` aynı bileşeni kullanıyor; ikisi de
 * `getAgentPerformance()` çıktısını gösteriyor. Faz 14'te YENİ SORGU
 * YAZILMADI: sayılar zaten Faz 6/8'de hesaplanıyordu, profil sayfası onları
 * yeniden kullanıyor.
 */
export async function AgentStats({
  performance,
  commissionRate,
}: {
  performance: AgentPerformance;
  /** Prim kutusunu göstermek için; verilmezse o kutu çizilmiyor. */
  commissionRate?: number;
}) {
  const [t, format] = await Promise.all([
    getTranslations("profile.stats"),
    getFormatter(),
  ]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        icon={<TrendingUp className="size-4" />}
        label={t("totalSales")}
        value={<AnimatedNumber value={performance.totalRevenue} format="compact" />}
        hint={t("totalSalesHint", { count: performance.totalSales })}
      />
      <StatTile
        icon={<Users className="size-4" />}
        label={t("customers")}
        value={<AnimatedNumber value={performance.totalCustomers} />}
        hint={t("customersHint", { count: performance.activeCustomers })}
      />
      <StatTile
        icon={<Building2 className="size-4" />}
        label={t("listings")}
        value={<AnimatedNumber value={performance.totalListings} />}
        hint={t("listingsHint", { count: performance.activeListings })}
      />
      {commissionRate !== undefined ? (
        <StatTile
          icon={<Coins className="size-4" />}
          label={t("monthlyCommission", {
            rate: formatRate(format, commissionRate),
          })}
          value={<AnimatedNumber value={performance.monthlyCommission} format="currency" />}
          hint={t("monthlyCommissionHint", {
            count: performance.monthlySales,
          })}
          emphasis
        />
      ) : (
        <StatTile
          icon={<Coins className="size-4" />}
          label={t("month")}
          value={<AnimatedNumber value={performance.monthlyRevenue} format="compact" />}
          hint={t("monthHint", { count: performance.monthlySales })}
        />
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  emphasis = false,
}: {
  icon: React.ReactNode;
  label: string;
  /** Manşet sayı — `AnimatedNumber` düğümü. */
  value: React.ReactNode;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {icon}
          {label}
        </p>
        <p
          className={
            emphasis
              ? "text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-brand"
              : "text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-foreground"
          }
        >
          {value}
        </p>
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
