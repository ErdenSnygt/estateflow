import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

import {
  getConversationById,
  getConversations,
  getMessages,
} from "@/lib/data/messages";
import { single, type SearchParamsInput } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata: Metadata = {
  title: "Mesajlar",
};

type PageProps = { searchParams: Promise<SearchParamsInput> };

/**
 * ============================================================================
 * MESAJ MERKEZİ — İKİ PANEL
 * ============================================================================
 * Seçili konuşma URL'DE (`?k=`), bileşen durumunda değil. Üç kazancı var:
 * bağlantı paylaşılabilir (bildirimden gelen link doğrudan konuşmayı açıyor),
 * geri tuşu çalışıyor ve mesajlar sunucuda çekilebiliyor.
 *
 * -----------------------------------------------------------------------------
 * MOBİLDE İKİ AYRI EKRAN — SAF CSS İLE
 * -----------------------------------------------------------------------------
 * Faz 9 deseni: 375 px'de iki panel yan yana sığmaz. Ayrım JavaScript'siz
 * yapılıyor, çünkü hangi panelin görüneceğini belirleyen şey ZATEN URL'de:
 *
 *   `?k` yok  → mobilde liste, masaüstünde liste + boş durum
 *   `?k` var  → mobilde konuşma, masaüstünde liste + konuşma
 *
 * `useMediaQuery` ile yapılsaydı sunucu her zaman `false` döndüğü için ilk
 * boyamada yanlış panel çizilir, hydration'dan sonra yerine oturur ve
 * kullanıcı bir kare titreme görürdü — Faz 9'da sidebar'da yaşanan sorun.
 *
 * -----------------------------------------------------------------------------
 * YÜKSEKLİK NEDEN SABİT
 * -----------------------------------------------------------------------------
 * Panellerin kendi içinde kayması gerekiyor (liste ayrı, akış ayrı), yani
 * sayfa gövdesi değil kutular kaymalı. `dvh` kullanılıyor: mobil tarayıcılarda
 * adres çubuğu gizlenip görünürken `vh` sabit kalıyor ve yazma alanı alt
 * gezinme çubuğunun altında kayboluyordu.
 */
export default async function MesajlarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeId = single(params, "k");

  /* KONUŞMA LİSTESİ VE MESAJLAR PARALEL.
     Önceki sürüm sırayla bekliyordu: önce liste, sonra seçili konuşmayı
     listede arayıp mesajları çekiyordu — iki ağ turu üst üste. Oysa hangi
     konuşmanın açılacağı ZATEN URL'DE (`?k=`), yani mesaj sorgusu listeyi
     beklemek zorunda değil. */
  const [conversations, messages] = await Promise.all([
    getConversations(),
    activeId ? getMessages(activeId) : Promise.resolve([]),
  ]);

  /* Seçili konuşmanın üstverisi genellikle listeden geliyor, ek sorgu yok.
     Listede yoksa (silinmiş ya da erişilemeyen bir kimlik) tek bir sorgu
     daha; o da null dönerse boş durum çiziliyor — hata sayfası değil. */
  const active = activeId
    ? (conversations.find((conversation) => conversation.id === activeId) ??
      (await getConversationById(activeId)))
    : null;

  /* Göreli zamanların ölçüldüğü an TEK YERDE ve sunucuda. İstemci
     bileşenlerinin kendi `Date.now()`unu çağırması hydration uyuşmazlığı
     üretirdi — gerekçe `lib/format.ts` içinde. */
  const reference = Date.now();

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[26rem] flex-col gap-4 md:h-[calc(100dvh-9rem)]">
      <PageHeader
        title="Mesajlar"
        description="Müşteri yazışmalarınız tek gelen kutusunda."
        className="shrink-0"
      />

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-hairline bg-surface md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        {/* --- Sol panel: konuşmalar --- */}
        <aside
          className={cn(
            "min-h-0 md:border-r md:border-hairline",
            active ? "hidden md:block" : "block",
          )}
        >
          <ConversationList
            conversations={conversations}
            activeId={active?.id}
            reference={reference}
          />
        </aside>

        {/* --- Sağ panel: seçili yazışma --- */}
        <section className={cn("min-h-0", active ? "block" : "hidden md:block")}>
          {active ? (
            <MessageThread
              conversation={active}
              messages={messages}
              reference={reference}
            />
          ) : (
            <EmptyThread hasConversations={conversations.length > 0} />
          )}
        </section>
      </div>
    </div>
  );
}

/** Masaüstünde konuşma seçilmediğinde sağ panelde duran boş durum. */
function EmptyThread({ hasConversations }: { hasConversations: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-surface-inset text-muted-foreground">
        <MessageSquare className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-[14px] font-medium text-foreground">
          {hasConversations ? "Bir konuşma seçin" : "Henüz yazışma yok"}
        </p>
        <p className="max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
          {hasConversations
            ? "Soldaki listeden bir müşteri seçerek yazışmayı görüntüleyin."
            : "Bir müşteri detay sayfasındaki “Mesaj gönder” düğmesiyle ilk yazışmayı başlatabilirsiniz."}
        </p>
      </div>
    </div>
  );
}
