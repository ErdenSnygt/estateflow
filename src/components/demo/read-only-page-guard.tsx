import { getTranslations } from "next-intl/server";
import { Eye } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

/**
 * Yazma sayfalarının demo kapısı — SUNUCUDA.
 *
 * `WriteLink` bağlantıya tıklamayı yutuyor ama adres çubuğuna
 * `/ilanlar/yeni` yazmayı yutamaz. Bu bileşen o yolu kapatıyor.
 *
 * Kullanımı `StaffGuard` ile aynı desende:
 *
 *     if (await isReadOnlySession()) return <ReadOnlyPageGuard />;
 *
 * YÖNLENDİRME DEĞİL SAYFA — `StaffGuard` başlığındaki gerekçenin aynısı:
 * kullanıcıyı sessizce başka bir yere atmak "bağlantı bozuk" hissi veriyor,
 * açık bir cevap daha kısa yol.
 */
export async function ReadOnlyPageGuard() {
  const t = await getTranslations("demo");

  return (
    <EmptyState
      icon={Eye}
      badge={t("badge")}
      title={t("blockedTitle")}
      description={t("bannerBody")}
    />
  );
}
