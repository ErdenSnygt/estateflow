"use client";

import { useTranslations } from "next-intl";

import type { AgentRole } from "@/types/database";
import { AGENT_ROLE_TONES } from "@/lib/agents";
import { Badge } from "@/components/ui/badge";

/**
 * `ListingStatusBadge` / `CustomerStatusBadge` ile aynı desen — TEK FARKLA:
 * bu rozet İSTEMCİ BİLEŞENİ, diğer üçü sunucu bileşeni.
 *
 * Gerekçe: rol rozeti listelerin yanında personel düzenleme formunun da
 * içinde çiziliyor (`agent-form.tsx`, kilitli rol alanı) ve bir istemci
 * bileşeninin ağacında `async` bir sunucu bileşeni kullanılamıyor. İki ayrı
 * rozet yazmak yerine ikisini de karşılayan tarafta duruyor; maliyeti bir
 * `useTranslations` çağrısı.
 */
export function AgentRoleBadge({
  role,
  size = "sm",
}: {
  role: AgentRole;
  size?: "sm" | "md";
}) {
  const t = useTranslations("agents.role");

  return (
    <Badge variant={AGENT_ROLE_TONES[role]} size={size}>
      {t(role)}
    </Badge>
  );
}
