"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import type { Notification } from "@/types/database";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { useRealtimeInsert } from "@/hooks/use-realtime-insert";
import { NotificationRow } from "@/components/notifications/notification-row";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Navbar'daki zil ve açılır bildirim listesi.
 *
 * -----------------------------------------------------------------------------
 * SUNUCUDAN GELEN VERİ + REALTIME ÜSTÜNE
 * -----------------------------------------------------------------------------
 * İlk liste sunucuda çekiliyor (`getRecentNotifications`), yani sayfa
 * bildirimlerle birlikte boyanıyor — boş bir zil gösterip sonra doldurmak
 * yerine. Realtime bunun ÜSTÜNE biniyor: açık dururken gelen yeni bildirim
 * listeye ekleniyor ve rozet artıyor.
 *
 * Sunucu verisi değiştiğinde (başka bir sayfaya gidildi, `router.refresh()`
 * çalıştı) yerel liste sıfırlanıyor — aşağıdaki `useEffect`. Aksi halde
 * okundu işaretledikten sonra eski hâl ekranda kalırdı.
 */
export function NotificationBell({
  initialNotifications,
  initialUnread,
  agentId,
  reference,
}: {
  initialNotifications: Notification[];
  initialUnread: number;
  /** Realtime filtresi bundan kuruluyor; yoksa abonelik açılmıyor. */
  agentId: string | null;
  /** Göreli zamanların ölçüldüğü an — sunucudan (`lib/format.ts`). */
  reference: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [items, setItems] = React.useState(initialNotifications);
  const [unread, setUnread] = React.useState(initialUnread);
  const [isBusy, setIsBusy] = React.useState(false);

  /* Sunucu tazelendiğinde yerel durumu ona teslim et — tek doğruluk kaynağı
     sunucu, Realtime yalnızca aradaki boşluğu dolduruyor. */
  React.useEffect(() => {
    setItems(initialNotifications);
    setUnread(initialUnread);
  }, [initialNotifications, initialUnread]);

  useRealtimeInsert<Notification>(
    {
      table: "notifications",
      channel: "navbar-notifications",
      filter: agentId ? `agent_id=eq.${agentId}` : undefined,
    },
    React.useCallback((row: Notification) => {
      setItems((current) => {
        /* Aynı satır iki kez gelebilir (yeniden bağlanma sonrası); kimliğe
           göre eleniyor. */
        if (current.some((item) => item.id === row.id)) return current;
        return [row, ...current].slice(0, 8);
      });
      setUnread((count) => count + 1);

      toast(row.title, {
        description: row.description || undefined,
        icon: <Bell className="size-4" />,
      });
    }, []),
  );

  async function handleMarkAll() {
    setIsBusy(true);
    const result = await markAllNotificationsRead();
    setIsBusy(false);

    if (!result.ok) {
      toast.error("İşlem tamamlanamadı", { description: result.error });
      return;
    }

    if (result.data.count === 0) {
      toast("Okunmamış bildirim yok");
      return;
    }

    toast.success(`${result.data.count} bildirim okundu olarak işaretlendi`);
    router.refresh();
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            unread > 0 ? `Bildirimler (${unread} okunmamış)` : "Bildirimler"
          }
          className={cn(
            "relative flex size-9 items-center justify-center rounded-lg text-muted-foreground",
            "transition-colors duration-200 hover:bg-surface-hover hover:text-foreground",
            "data-[state=open]:bg-surface-hover data-[state=open]:text-foreground",
          )}
        >
          <Bell className="size-[18px]" />

          {unread > 0 && (
            /* Sayı 9'u aşınca "9+": iki haneli bir rozet 36 piksellik
               düğmenin dışına taşıyordu. */
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-[18px] text-brand-foreground ring-2 ring-canvas">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2.5">
          <p className="text-[13px] font-semibold text-foreground">
            Bildirimler
            {unread > 0 && (
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                {unread} yeni
              </span>
            )}
          </p>

          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              Tümünü okundu yap
            </button>
          )}
        </div>

        <div className="max-h-[min(26rem,60vh)] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
              Henüz bildiriminiz yok.
            </p>
          ) : (
            <div className="space-y-0.5">
              {items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  reference={reference}
                  onNavigate={() => setIsOpen(false)}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-hairline p-1.5">
          <Link
            href="/bildirimler"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-center text-[12.5px] font-medium text-brand transition-colors hover:bg-surface-hover"
          >
            Tümünü gör
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
