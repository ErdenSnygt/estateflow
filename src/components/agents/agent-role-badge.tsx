import { useTranslations } from "next-intl";

import type { AgentRole } from "@/types/database";
import { AGENT_ROLE_TONES } from "@/lib/agents";
import { Badge } from "@/components/ui/badge";

/**
 * `ListingStatusBadge` / `CustomerStatusBadge` ile aynı desen ve artık aynı
 * sınıfta: hiçbiri `"use client"` taşımıyor.
 *
 * Rol rozeti hem listelerde (sunucu) hem personel düzenleme formunda
 * (`agent-form.tsx`, kilitli rol alanı — istemci) çiziliyor. Faz 25'e kadar
 * bu yüzden istemci bileşeni ilan edilmişti; oysa gerekmiyordu. `async`
 * OLMAYAN bir sunucu bileşeni işaretsiz bırakıldığında her iki bağlamda da
 * çalışır: sunucudan çağrılınca sunucuda çizilir, istemciden çağrılınca o
 * sayfanın istemci parçasına girer. `useTranslations` ikisini de destekliyor.
 *
 * Kazanç `/personeller` ve `/personeller/[id]` paketlerinde: rozet oralarda
 * yalnızca sunucudan çağrılıyor ve artık tarayıcıya hiç inmiyor.
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
