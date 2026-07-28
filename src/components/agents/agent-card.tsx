import Link from "next/link";
import { Building2, Coins, TrendingUp, Users } from "lucide-react";

import type { Agent } from "@/types/database";
import type { AgentPerformance } from "@/lib/data/agents";
import { formatCurrencyCompact } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { AgentRoleBadge } from "@/components/agents/agent-role-badge";

/** Izgara görünümündeki personel kartı — `CustomerCard` ile aynı iskelet. */
export function AgentCard({
  agent,
  performance,
}: {
  agent: Agent;
  performance: AgentPerformance;
}) {
  return (
    <Link
      href={`/personeller/${agent.id}`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card interactive className="h-full">
        <div className="flex flex-1 flex-col gap-3.5 p-4">
          {/* --- Kimlik --- */}
          <div className="flex items-start gap-3">
            <AgentAvatar
              name={agent.full_name}
              initials={agent.initials}
              src={agent.avatar_url}
              size={44}
            />

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14.5px] font-semibold text-foreground">
                {agent.full_name}
              </h3>
              <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                {agent.title}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <AgentRoleBadge role={agent.role} />
              {/* Pasif personel listede kalır — geçmiş kayıtları duruyor. */}
              {!agent.is_active && <Badge variant="outline">Pasif</Badge>}
            </div>
          </div>

          {/* --- Bu ayki performans --- */}
          <div className="rounded-lg bg-surface-inset px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <TrendingUp className="size-3.5" />
              Bu ay · {performance.monthlySales} satış
            </p>
            <p className="mt-0.5 text-[13.5px] font-medium tabular-nums text-foreground">
              {formatCurrencyCompact(performance.monthlyRevenue)}
            </p>
          </div>

          {/* --- Prim ---
              Yüzde de gösteriliyor: tutar tek başına "neye göre" sorusunu
              bırakıyor, oran onu tek bakışta yanıtlıyor. */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Coins className="size-3.5" />
              Prim (%{(agent.commission_rate * 100).toFixed(1)})
            </span>
            <span className="text-[13.5px] font-medium tabular-nums text-brand">
              {formatCurrencyCompact(performance.monthlyCommission)}
            </span>
          </div>

          {/* --- Alt bilgi --- */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-hairline pt-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              {performance.activeCustomers} aktif müşteri
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {performance.activeListings} aktif ilan
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
