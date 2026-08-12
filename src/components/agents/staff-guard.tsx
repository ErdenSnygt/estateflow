import { getTranslations } from "next-intl/server";
import { ShieldX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

/**
 * Personeller modülünün yetkisiz görünümü.
 *
 * YÖNLENDİRME YERİNE SAYFA: `/personeller`e tıklayan bir danışmanı sessizce
 * dashboard'a atmak "bağlantı bozuk" hissi verir — kullanıcı ne olduğunu
 * anlamaz ve tekrar dener. Açık bir cevap hem dürüst hem de daha kısa yol.
 *
 * Menü öğesi gizlenmiyor: ekipte böyle bir modülün VAR olduğunu bilmek,
 * gerektiğinde yöneticiden istemeyi mümkün kılıyor. Gizli menü, keşfedilmemiş
 * yetki demek.
 */
export async function StaffGuard() {
  const t = await getTranslations("agents.guard");

  return (
    <EmptyState
      icon={ShieldX}
      badge={t("badge")}
      title={t("title")}
      description={t("description")}
    />
  );
}
