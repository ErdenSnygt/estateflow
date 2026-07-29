"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import type { Notification } from "@/types/database";
import { notificationHref } from "@/lib/messaging";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteNotification,
  markNotificationRead,
  markNotificationUnread,
} from "@/lib/actions/notifications";
import { NotificationIcon } from "@/components/notifications/notification-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Gelen kutusundaki tek satır.
 *
 * TIKLAMA İKİ İŞ YAPIYOR: okundu işaretler ve hedefe gider. Ayrı bir "okundu"
 * düğmesine tıklatmak, kullanıcının zaten yaptığı şeyi (bildirime bakmak) bir
 * kez daha yaptırmak olurdu. Ayrı düğme yine de duruyor — hedefe gitmeden
 * temizlemek isteyenler için.
 *
 * `reference` DIŞARIDAN GELİYOR: `formatRelativeTime` zaman kaynağını çağırana
 * bıraktırıyor, aksi halde sunucu ve istemci farklı "şimdi" hesaplayıp
 * hydration uyuşmazlığı üretirdi (gerekçe `lib/format.ts`).
 */
export function NotificationRow({
  notification,
  reference,
  onNavigate,
  compact = false,
}: {
  notification: Notification;
  reference: number;
  /** Açılırdan tıklandığında paneli kapatmak için. */
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = React.useState(false);

  const href = notificationHref(
    notification.related_entity_type,
    notification.related_entity_id,
  );
  const isUnread = notification.read_at === null;

  async function handleOpen() {
    onNavigate?.();
    if (isUnread) {
      /* Sonuç BEKLENMİYOR: kullanıcı hedefe gitmek istiyor, okundu işareti
         onun için bir bekleme sebebi değil. Hata olursa satır okunmamış
         kalıyor — sessiz ve zararsız. */
      void markNotificationRead(notification.id);
    }
  }

  async function toggleRead(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    setIsBusy(true);
    const result = isUnread
      ? await markNotificationRead(notification.id)
      : await markNotificationUnread(notification.id);
    setIsBusy(false);

    if (!result.ok) {
      toast.error("İşlem tamamlanamadı", { description: result.error });
      return;
    }
    router.refresh();
  }

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    setIsBusy(true);
    const result = await deleteNotification(notification.id);
    setIsBusy(false);

    if (!result.ok) {
      toast.error("Bildirim silinemedi", { description: result.error });
      return;
    }
    router.refresh();
  }

  const body = (
    <>
      <NotificationIcon type={notification.type} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 text-[13px] leading-snug",
              isUnread
                ? "font-medium text-foreground"
                : "text-secondary-foreground",
            )}
          >
            {notification.title}
          </p>
          {/* Okunmamış noktası — rozet yerine nokta, çünkü sayı taşımıyor. */}
          {isUnread && (
            <span
              aria-label="Okunmadı"
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand"
            />
          )}
        </div>

        {notification.description && (
          <p
            className={cn(
              "mt-0.5 text-[12.5px] text-muted-foreground",
              compact ? "truncate" : "line-clamp-2",
            )}
          >
            {notification.description}
          </p>
        )}

        <p className="mt-1 text-[11.5px] tabular-nums text-muted-foreground">
          {formatRelativeTime(notification.created_at, reference)}
        </p>
      </div>

      {!compact && (
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleRead}
                disabled={isBusy}
                aria-label={isUnread ? "Okundu işaretle" : "Okunmadı işaretle"}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              >
                {isUnread ? (
                  <Check className="size-4" />
                ) : (
                  <Undo2 className="size-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isUnread ? "Okundu işaretle" : "Okunmadı işaretle"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isBusy}
                aria-label="Bildirimi sil"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Sil</TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  );

  const shell = cn(
    "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
    isUnread ? "bg-surface-inset" : "bg-transparent",
    href ? "hover:bg-surface-hover" : "cursor-default",
  );

  /* Hedefi silinmiş bildirim TIKLANAMAZ. Polimorfik bağın bedeli bu: kayıt
     gitmiş olabilir ve kırık bir bağlantıya tıklatıp 404 göstermektense
     satırı düz metin bırakmak dürüst. */
  if (!href) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link href={href} onClick={handleOpen} className={shell}>
      {body}
    </Link>
  );
}
