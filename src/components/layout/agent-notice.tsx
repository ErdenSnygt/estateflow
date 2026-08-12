"use client";

import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";

import { useSessionUser } from "@/components/layout/session-provider";

/**
 * Personel kaydına bağlanmamış kullanıcı uyarısı.
 *
 * NEDEN VAR: RLS politikaları `agents.user_id = auth.uid()` üzerinden çalışıyor
 * (`0002_agents_auth_link.sql`). Supabase'de hesabı olan ama hiçbir `agents`
 * satırına bağlanmamış biri giriş yapabilir — ve tamamen BOŞ bir uygulama
 * görür: sıfır ilan, sıfır müşteri, sıfır KPI. Bu, bozulmuş bir uygulamadan
 * ayırt edilemez.
 *
 * Uyarı o boşluğa isim veriyor. Kendiliğinden kaybolur: kullanıcı bir personel
 * kaydına bağlandığı anda `agentId` dolar.
 */
export function AgentNotice() {
  const user = useSessionUser();
  const t = useTranslations("notices");

  if (user.agentId) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="min-w-0 space-y-1">
        <p className="text-[13.5px] font-medium text-foreground">
          {t("noAgentTitle")}
        </p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {t("noAgentBody")}
        </p>
      </div>
    </div>
  );
}
