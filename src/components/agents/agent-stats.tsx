import { Building2, Coins, TrendingUp, Users } from "lucide-react";

import type { AgentPerformance } from "@/lib/data/agents";
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
export function AgentStats({
  performance,
  commissionRate,
}: {
  performance: AgentPerformance;
  /** Prim kutusunu göstermek için; verilmezse o kutu çizilmiyor. */
  commissionRate?: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        icon={<TrendingUp className="size-4" />}
        label="Toplam satış"
        value={<AnimatedNumber value={performance.totalRevenue} format="compact" />}
        hint={`${performance.totalSales} kapanan işlem`}
      />
      <StatTile
        icon={<Users className="size-4" />}
        label="Müşteri"
        value={<AnimatedNumber value={performance.totalCustomers} />}
        hint={`${performance.activeCustomers} aktif`}
      />
      <StatTile
        icon={<Building2 className="size-4" />}
        label="İlan"
        value={<AnimatedNumber value={performance.totalListings} />}
        hint={`${performance.activeListings} aktif`}
      />
      {commissionRate !== undefined ? (
        <StatTile
          icon={<Coins className="size-4" />}
          label={`Bu ayki prim · %${(commissionRate * 100).toFixed(1)}`}
          value={<AnimatedNumber value={performance.monthlyCommission} format="currency" />}
          hint={`${performance.monthlySales} işlem bu ay`}
          emphasis
        />
      ) : (
        <StatTile
          icon={<Coins className="size-4" />}
          label="Bu ay"
          value={<AnimatedNumber value={performance.monthlyRevenue} format="compact" />}
          hint={`${performance.monthlySales} işlem`}
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
