"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import type { ConversationListItem } from "@/lib/data/messages";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { CustomerAvatar } from "@/components/customers/customer-avatar";

/**
 * Sol paneldeki konuşma listesi.
 *
 * ARAMA YEREL, URL'DE DEĞİL. Diğer modüllerde filtreler URL'e yazılıyor ama
 * burada `k` (seçili konuşma) zaten URL'de duruyor ve aramayı da oraya
 * eklemek her harfte sunucuya gidip gelmek demekti — üstelik seçili konuşma
 * korunurken. Liste zaten elde, filtreleme anlık.
 */
export function ConversationList({
  conversations,
  activeId,
  reference,
}: {
  conversations: ConversationListItem[];
  activeId?: string;
  /**
   * Göreli zamanların ölçüldüğü an — SUNUCUDAN geliyor.
   *
   * `Date.now()` burada çağrılsaydı sunucu ile istemci farklı "şimdi"
   * hesaplar ve hydration uyuşmazlığı doğardı; `formatRelativeTime` zaten
   * bu yüzden zaman kaynağını çağırana bırakıyor (`lib/format.ts`). Değer
   * her sunucu render'ında tazeleniyor.
   */
  reference: number;
}) {
  const [search, setSearch] = React.useState("");

  const term = search.trim().toLocaleLowerCase("tr-TR");
  const visible = term
    ? conversations.filter(
        (conversation) =>
          conversation.customer?.full_name
            .toLocaleLowerCase("tr-TR")
            .includes(term) ||
          conversation.preview.toLocaleLowerCase("tr-TR").includes(term),
      )
    : conversations;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-hairline p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Müşteri ara…"
            className="pl-9"
            aria-label="Konuşmalarda ara"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
            {conversations.length === 0
              ? "Henüz yazışma yok. Bir müşteri detayından mesaj göndererek başlayın."
              : "Aramanıza uyan konuşma yok."}
          </p>
        ) : (
          <div className="space-y-0.5">
            {visible.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeId}
                reference={reference}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  isActive,
  reference,
}: {
  conversation: ConversationListItem;
  isActive: boolean;
  reference: number;
}) {
  const name = conversation.customer?.full_name ?? "Silinmiş müşteri";

  return (
    <Link
      href={`/mesajlar?k=${conversation.id}`}
      /* `scroll: false` YOK ama gerekli değil: liste kendi kabında kayıyor,
         sayfa gövdesi değil. */
      className={cn(
        "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
        isActive ? "bg-surface-active" : "hover:bg-surface-hover",
      )}
    >
      <CustomerAvatar
        name={name}
        src={conversation.customer?.avatar_url ?? null}
        size={40}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-[13.5px]",
              conversation.unread > 0
                ? "font-semibold text-foreground"
                : "font-medium text-secondary-foreground",
            )}
          >
            {name}
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatRelativeTime(conversation.last_message_at, reference)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-[12.5px]",
              conversation.unread > 0
                ? "text-secondary-foreground"
                : "text-muted-foreground",
            )}
          >
            {conversation.preview}
          </p>

          {conversation.unread > 0 && (
            <span className="flex min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-[18px] text-brand-foreground">
              {conversation.unread > 9 ? "9+" : conversation.unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
