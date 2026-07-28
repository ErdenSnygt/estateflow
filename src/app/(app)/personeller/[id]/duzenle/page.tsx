import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAgentById } from "@/lib/data/agents";
import { getManagerAgent } from "@/lib/auth/server";
import { PageHeader } from "@/components/page-header";
import { StaffGuard } from "@/components/agents/staff-guard";
import { AgentForm } from "@/components/agents/agent-form";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const agent = await getAgentById(id);
  return {
    title: agent ? `${agent.full_name} · Düzenle` : "Personel bulunamadı",
  };
}

/**
 * Personel düzenleme.
 *
 * Sayfa yönetici kapısının arkasında ama BU BİR GÜVENLİK KATMANI DEĞİL: form
 * `updateAgent` action'ını çağırıyor ve o action servis anahtarıyla çalışıyor,
 * yani RLS onu durdurmaz. Yetki kontrolü action'ın ilk satırında ve asıl kapı
 * orası (`lib/auth/admin-actions.ts`). Buradaki kontrol, yetkisiz kullanıcıya
 * dolduramayacağı bir form göstermemek için.
 */
export default async function EditAgentPage({ params }: PageProps) {
  const { id } = await params;

  const [manager, agent] = await Promise.all([
    getManagerAgent(),
    getAgentById(id),
  ]);

  if (!manager) return <StaffGuard />;
  if (!agent) notFound();

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        backHref={`/personeller/${agent.id}`}
        backLabel="Personele dön"
        title="Personeli düzenle"
        description={`${agent.id.toUpperCase()} · ${agent.email}`}
      />

      <AgentForm agent={agent} actorId={manager.id} actorRole={manager.role} />
    </div>
  );
}
