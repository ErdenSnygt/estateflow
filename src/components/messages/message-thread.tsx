"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Phone } from "lucide-react";

import type { ConversationListItem, MessageItem } from "@/lib/data/messages";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markConversationRead } from "@/lib/actions/messages";
import { useRealtimeInsert } from "@/hooks/use-realtime-insert";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { MessageComposer } from "@/components/messages/message-composer";

/**
 * ============================================================================
 * SAĞ PANEL — MESAJ AKIŞI
 * ============================================================================
 * Sunucudan gelen mesaj listesinin ÜSTÜNE Realtime biniyor: konuşma açıkken
 * gelen yeni satır listeye ekleniyor, sayfa yenilenmiyor. Bu, uygulamada
 * Realtime'ın kullanıldığı iki yerden biri (diğeri bildirim zili) —
 * gerekçe `hooks/use-realtime-insert.ts` başlığında.
 *
 * -----------------------------------------------------------------------------
 * OKUNDU İŞARETİ AÇILIŞTA
 * -----------------------------------------------------------------------------
 * Konuşma görüntülendiği anda müşteriden gelen okunmamışlar okundu sayılıyor.
 * "Okundu" düğmesi koymak, kullanıcının zaten yaptığı şeyi (mesajı okumak)
 * bir kez daha yaptırmak olurdu. Sonuç beklenmiyor: işaretleme başarısız
 * olursa rozet bir süre daha görünür kalır, zararsız.
 */
export function MessageThread({
  conversation,
  messages: initialMessages,
  reference,
}: {
  conversation: ConversationListItem;
  messages: MessageItem[];
  /** Göreli zamanların ölçüldüğü an — sunucudan; gerekçe `ConversationList`. */
  reference: number;
}) {
  const router = useRouter();
  const [messages, setMessages] = React.useState(initialMessages);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  /* Sunucu tazelendiğinde tek doğruluk kaynağı yine sunucu. */
  React.useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  /* Konuşma değiştiğinde ve yeni mesaj geldiğinde en alta in. `behavior`
     yok: sohbet açılırken kaydırma animasyonu izlemek istenmez, doğrudan
     sonda başlamalı. */
  React.useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  React.useEffect(() => {
    if (conversation.unread === 0) return;
    void markConversationRead(conversation.id).then(() => router.refresh());
  }, [conversation.id, conversation.unread, router]);

  useRealtimeInsert<MessageItem>(
    {
      table: "messages",
      channel: `thread-${conversation.id}`,
      filter: `conversation_id=eq.${conversation.id}`,
    },
    React.useCallback(
      (row: MessageItem) => {
        setMessages((current) => {
          if (current.some((message) => message.id === row.id)) return current;
          return [...current, row];
        });

        /* Ek geldiyse imzalı adres YOK — Realtime yükü ham satır taşıyor ve
           imza yalnızca sunucuda üretilebiliyor. Tazeleme onu getiriyor. */
        if (row.attachment_url) router.refresh();
      },
      [router],
    ),
  );

  const customerName = conversation.customer?.full_name ?? "Silinmiş müşteri";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* --- Başlık --- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-hairline px-3 py-2.5">
        {/* Mobilde listeye dönüş. Düğme değil BAĞLANTI: seçili konuşma URL'de
            duruyor (`?k=`), geri gitmek onu temizlemek demek — tarayıcının
            geri tuşu da aynı işi yapıyor. `md:hidden` çünkü masaüstünde iki
            panel yan yana ve dönülecek bir yer yok. */}
        <Link
          href="/mesajlar"
          aria-label="Konuşma listesine dön"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
        >
          <ArrowLeft className="size-[18px]" />
        </Link>

        <CustomerAvatar
          name={customerName}
          src={conversation.customer?.avatar_url ?? null}
          size={38}
        />

        <div className="min-w-0 flex-1">
          {conversation.customer ? (
            <Link
              href={`/musteriler/${conversation.customer.id}`}
              className="block truncate text-[14px] font-semibold text-foreground transition-colors hover:text-brand"
            >
              {customerName}
            </Link>
          ) : (
            <p className="truncate text-[14px] font-semibold text-muted-foreground">
              {customerName}
            </p>
          )}
          {conversation.agent && (
            <p className="truncate text-[11.5px] text-muted-foreground">
              Sorumlu: {conversation.agent.full_name}
            </p>
          )}
        </div>

        {conversation.customer?.phone && (
          <a
            href={`tel:${conversation.customer.phone.replace(/\s/g, "")}`}
            aria-label="Müşteriyi ara"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Phone className="size-[18px]" />
          </a>
        )}
      </header>

      {/* --- Akış --- */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            Bu konuşmada henüz mesaj yok. Aşağıdan ilk mesajı gönderin.
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                reference={reference}
              />
            ))}
          </div>
        )}
      </div>

      {/* --- Yazma alanı --- */}
      <MessageComposer conversationId={conversation.id} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function MessageBubble({
  message,
  reference,
}: {
  message: MessageItem;
  reference: number;
}) {
  const isOwn = message.sender_type === "agent";

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(28rem,85%)] space-y-1.5 rounded-2xl px-3.5 py-2.5",
          isOwn
            ? "rounded-br-md bg-brand text-brand-foreground"
            : "rounded-bl-md bg-surface-inset text-foreground",
        )}
      >
        {message.attachment_url && (
          <Attachment message={message} isOwn={isOwn} />
        )}

        {message.content && (
          <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
            {message.content}
          </p>
        )}

        <p
          className={cn(
            "text-right text-[10.5px] tabular-nums",
            isOwn ? "text-brand-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatRelativeTime(message.created_at, reference)}
        </p>
      </div>
    </div>
  );
}

/**
 * Mesaj eki.
 *
 * Adres SÜRELİ (60 sn) ve sunucuda üretiliyor. Süresi dolmuş ya da
 * üretilememiş bir ekte bağlantı verilmiyor — kırık bir görsel yerine
 * "yenileyin" diyen bir kutu.
 */
function Attachment({
  message,
  isOwn,
}: {
  message: MessageItem;
  isOwn: boolean;
}) {
  const url = message.attachment_signed_url;

  if (!url) {
    return (
      <div
        className={cn(
          "rounded-lg px-3 py-2 text-[12px]",
          isOwn ? "bg-white/15" : "bg-surface",
        )}
      >
        Ek yüklenemedi — sayfayı yenileyin.
      </div>
    );
  }

  if (message.attachment_type === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* `next/image` DEĞİL: imzalı adres her istekte değişiyor ve
            `remotePatterns` imza parametrelerini kapsamıyor; optimizasyon
            katmanı burada hiçbir şey kazandırmaz, yalnızca kırılır. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Mesaj eki"
          className="max-h-64 w-full rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] transition-colors",
        isOwn ? "bg-white/15 hover:bg-white/25" : "bg-surface hover:bg-surface-hover",
      )}
    >
      <FileText className="size-4 shrink-0" />
      <span className="truncate">Dosya eki — açmak için tıklayın</span>
    </a>
  );
}
