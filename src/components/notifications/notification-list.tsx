"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import type { Notification } from "@/types/database";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/messaging";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationRow } from "@/components/notifications/notification-row";

/**
 * `/bildirimler` sayfasının gövdesi.
 *
 * FİLTRE URL'DE DEĞİL, YEREL DURUMDA. Projenin geri kalanında filtreler URL'e
 * yazılıyor (`listings-filters.ts` deseni) çünkü oradaki listeler paylaşılan
 * ve yer imlenen sayfalar. Gelen kutusu kişisel: kimse "okunmamış
 * bildirimlerim" linkini paylaşmıyor ve her filtre değişiminde sunucuya gidip
 * gelmek burada yalnızca gecikme eklerdi. Liste zaten elde.
 */
type Filter = "all" | "unread";

export function NotificationList({
  notifications,
  reference,
}: {
  notifications: Notification[];
  /** Göreli zamanların ölçüldüğü an — sunucudan (`lib/format.ts`). */
  reference: number;
}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [isBusy, setIsBusy] = React.useState(false);

  const unreadCount = notifications.filter(
    (notification) => notification.read_at === null,
  ).length;

  const visible =
    filter === "unread"
      ? notifications.filter((notification) => notification.read_at === null)
      : notifications;

  async function handleMarkAll() {
    setIsBusy(true);
    const result = await markAllNotificationsRead();
    setIsBusy(false);

    if (!result.ok) {
      toast.error("İşlem tamamlanamadı", { description: result.error });
      return;
    }
    toast.success(`${result.data.count} bildirim okundu olarak işaretlendi`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Bildirim filtresi"
          className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-inset p-1"
        >
          <FilterTab
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Tümü"
            count={notifications.length}
          />
          <FilterTab
            active={filter === "unread"}
            onClick={() => setFilter("unread")}
            label="Okunmamış"
            count={unreadCount}
          />
        </div>

        {unreadCount > 0 && (
          <Button variant="secondary" onClick={handleMarkAll} disabled={isBusy}>
            <CheckCheck className="size-4" />
            Tümünü okundu yap
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-[13px] text-muted-foreground">
            {filter === "unread"
              ? "Okunmamış bildiriminiz yok."
              : "Henüz bildiriminiz yok. Size müşteri atandığında, ilanınız satıldığında ya da müşteriden mesaj geldiğinde burada görünecek."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-0.5 p-2">
            {visible.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                reference={reference}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tür açıklaması: kullanıcı ilk kez baktığında hangi olayların bildirim
          ürettiğini bilmiyor. Boş durumda özellikle işe yarıyor. */}
      <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        Bildirim türleri:{" "}
        {Object.values(NOTIFICATION_TYPE_LABELS).join(" · ")}. Bunlar size özel;
        ofisin genel hareket akışı için dashboard&apos;daki{" "}
        <span className="text-secondary-foreground">Son Aktiviteler</span>{" "}
        listesine bakın.
      </p>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-surface text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="text-[11.5px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </button>
  );
}
