import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UserRound } from "lucide-react";

import { getAgentPerformances, getAgents } from "@/lib/data/agents";
import { getManagerAgent } from "@/lib/auth/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AgentCard } from "@/components/agents/agent-card";
import { StaffGuard } from "@/components/agents/staff-guard";
import { InviteAgentDialog } from "@/components/agents/invite-agent-dialog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("agents.page");
  return { title: t("title") };
}

/**
 * Ekip listesi.
 *
 * YETKİ İKİ KATMANDA: burada `getManagerAgent()` sayfayı kapatıyor, RLS de
 * `agents_read` politikasıyla verinin kendisini kapatıyor. Yalnızca sayfayı
 * kapatmak yeterli olmazdı — bir danışman veriyi başka bir yoldan (ör. form
 * açılırı) çekebilirdi. Yalnızca RLS'e güvenmek de yetmezdi: sayfa açılır,
 * boş bir ızgara çizilir ve kullanıcı nedenini anlayamazdı.
 */
export default async function PersonellerPage() {
  /* Yetki kontrolü ile ekip listesi paralel: yetkisiz kullanıcıda liste zaten
     RLS tarafından tek satıra iniyor, boşuna beklemeye değmez. Performans
     toplamları `agents`e bağlı olduğu için ancak ondan sonra başlayabiliyor. */
  const [manager, agents, t] = await Promise.all([
    getManagerAgent(),
    getAgents(),
    getTranslations("agents.page"),
  ]);

  if (!manager) return <StaffGuard />;

  const performances = await getAgentPerformances(agents);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={t("title")}
        description={t("description", { count: agents.length })}
        actions={
          <InviteAgentDialog canAssignPatron={manager.role === "patron"} />
        }
      />

      {agents.length === 0 ? (
        <EmptyState
          icon={UserRound}
          badge={t("emptyBadge")}
          title={t("emptyTitle")}
          description={t("emptyBody")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {agents.map((agent) => {
            const performance = performances.get(agent.id);
            /* Harita `agents` listesinden kuruluyor, yani her zaman dolu —
               yine de tip düzeyinde `undefined` olabilir. */
            if (!performance) return null;

            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                performance={performance}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
