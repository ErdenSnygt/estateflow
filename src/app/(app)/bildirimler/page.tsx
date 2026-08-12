import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getNotifications } from "@/lib/data/notifications";
import { getCurrentAgent } from "@/lib/auth/server";
import { PageHeader } from "@/components/page-header";
import { AgentNotice } from "@/components/layout/agent-notice";
import { NotificationList } from "@/components/notifications/notification-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications.page");
  return { title: t("title") };
}

/**
 * Kişisel gelen kutusu.
 *
 * SAYFA ROL KAPISI TAŞIMIYOR — herkesin bildirimi var ve herkes yalnızca
 * kendininkini görüyor. Veri katmanı her sorguya `agent_id = ben` filtresini
 * kendisi ekliyor (`data/notifications.ts`), yani bir yöneticinin gelen
 * kutusunda ekibin bildirimleri belirmiyor.
 */
export default async function BildirimlerPage() {
  const [agent, notifications, t] = await Promise.all([
    getCurrentAgent(),
    getNotifications(),
    getTranslations("notifications.page"),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {/* Personel kaydına bağlanmamış kullanıcıya boş liste göstermek
          "bildiriminiz yok" der; oysa sebep farklı — hiç okuyamıyor. */}
      {agent ? (
        /* Göreli zamanların ölçüldüğü an sunucuda üretiliyor — gerekçe
           `lib/format.ts` içinde. */
        <NotificationList
          notifications={notifications}
          reference={Date.now()}
        />
      ) : (
        <AgentNotice />
      )}
    </div>
  );
}
