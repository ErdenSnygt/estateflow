import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, Settings, UserRound } from "lucide-react";

import { getCurrentAgent } from "@/lib/auth/server";
import { getAgentPerformance } from "@/lib/data/agents";
import { computeBadges } from "@/lib/badges";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { AgentNotice } from "@/components/layout/agent-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AgentCover } from "@/components/agents/agent-cover";
import { AgentStats } from "@/components/agents/agent-stats";
import { AgentBadges } from "@/components/agents/agent-badges";

export const metadata: Metadata = {
  title: "Profilim",
};

/**
 * ============================================================================
 * PROFİLİM
 * ============================================================================
 * -----------------------------------------------------------------------------
 * NEDEN AYRI ROUTE, `/personeller/[id]` DEĞİL
 * -----------------------------------------------------------------------------
 * `/personeller/[id]` YÖNETİCİ KAPISININ ARKASINDA (`getManagerAgent()`): bir
 * danışman o sayfaya giremiyor ve girmemeli — orası ekip yönetimi ekranı,
 * başkalarının primini ve performansını gösteriyor.
 *
 * Ama herkesin kendi profiline erişmesi gerekiyor. Seçenekler:
 *
 *   1. `/personeller/[id]` kapısını "ya yöneticiyse ya da kendi kaydıysa"
 *      diye gevşetmek. Tek sayfa iki farklı işi yapardı: bir yönetici için
 *      "personeli yönet", kullanıcının kendisi için "profilim". Düğmeler,
 *      başlık ve dönüş bağlantısı da ikiye ayrılırdı.
 *   2. Ayrı bir route, PAYLAŞILAN BİLEŞENLERLE.
 *
 * İkincisi seçildi. Kod tekrarı yok: `AgentCover`, `AgentStats` ve
 * `AgentBadges` her iki sayfada da aynı; farklı olan yalnızca sayfanın
 * çerçevesi ve düğmeleri — zaten farklı olması gereken şeyler.
 *
 * Yeni sorgu da yazılmadı: `getAgentPerformance()` Faz 6/8'den beri var.
 */
export default async function ProfilPage() {
  const agent = await getCurrentAgent();

  if (!agent) {
    return (
      <div className="space-y-6 pb-4">
        <PageHeader
          title="Profilim"
          description="Hesabınıza bağlı personel kaydı."
        />
        <AgentNotice />
      </div>
    );
  }

  const performance = await getAgentPerformance(agent.id);
  const badges = computeBadges(performance);

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Profilim"
        description="Performansınız, iletişim bilgileriniz ve rozetleriniz."
        actions={
          <Button asChild>
            <Link href="/ayarlar">
              <Settings className="size-4" />
              Ayarlar
            </Link>
          </Button>
        }
      />

      <AgentCover agent={agent} />

      <AgentStats
        performance={performance}
        commissionRate={agent.commission_rate}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <AgentBadges badges={badges} />

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="text-[15px] font-semibold text-foreground">
              Hesap bilgileri
            </h3>

            <div className="space-y-2 border-t border-hairline pt-4">
              <InfoRow
                icon={<Phone className="size-3.5" />}
                label="Telefon"
                value={agent.phone || "—"}
              />
              <InfoRow
                icon={<Mail className="size-3.5" />}
                label="E-posta"
                value={agent.email}
              />
              <InfoRow
                icon={<UserRound className="size-3.5" />}
                label="Personel kodu"
                value={agent.id.toUpperCase()}
              />
            </div>

            <p className="border-t border-hairline pt-4 text-[12px] leading-relaxed text-muted-foreground">
              {formatDate(agent.created_at)} tarihinde ekibe katıldınız. Rol ve
              prim oranınızı yalnızca ofis yöneticiniz değiştirebilir.
            </p>

            <Button variant="secondary" className="w-full" asChild>
              <Link href="/ayarlar">Profili düzenle</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-secondary-foreground">
        {value}
      </span>
    </div>
  );
}
