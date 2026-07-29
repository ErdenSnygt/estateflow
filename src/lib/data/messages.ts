import type { MessageAttachmentType, MessageSender } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { maybeRow, rows } from "@/lib/data/query";
import { signedUrlsFor } from "@/lib/storage/signed";

/**
 * ============================================================================
 * MESAJ VERİ ERİŞİMİ
 * ============================================================================
 * İki panelli düzenin iki ayrı sorgusu var ve bilinçli olarak AYRI: sol
 * paneldeki konuşma listesi her sayfa açılışında çekiliyor, sağ paneldeki
 * mesajlar yalnızca bir konuşma seçiliyken. Tek sorguda birleştirmek, konuşma
 * seçilmeden de bütün mesajları taşımak olurdu.
 *
 * RLS burada da görünmez ama etkili: danışman yalnızca kendi yürüttüğü ya da
 * müşterisine ait konuşmaları görür (`0008_messaging.sql`), yönetici hepsini.
 */

/* ==========================================================================
   Konuşma listesi
   ========================================================================== */

export type ConversationListItem = {
  id: string;
  customer_id: string;
  last_message_at: string;
  customer: {
    id: string;
    full_name: string;
    phone: string;
    avatar_url: string | null;
  } | null;
  agent: { id: string; full_name: string; initials: string } | null;
  /** Listede gösterilen son mesaj özeti. */
  preview: string;
  unread: number;
};

const CONVERSATION_SELECT = `
  id, customer_id, last_message_at,
  customer:customers(id, full_name, phone, avatar_url),
  agent:agents(id, full_name, initials)
`;

/**
 * Sol paneldeki konuşma listesi.
 *
 * -----------------------------------------------------------------------------
 * SON MESAJ VE OKUNMAMIŞ SAYISI NEDEN AYRI SORGUDA
 * -----------------------------------------------------------------------------
 * PostgREST gömülü ilişkiyi SINIRLAYAMIYOR: `messages(...)` yazıp "her konuşma
 * için yalnızca en son satır" demenin bir yolu yok — ya hepsi gelir ya hiçbiri.
 * Konuşma başına ayrı sorgu atmak ise N+1 demekti (20 konuşma = 20 tur).
 *
 * Çözüm iki tur: önce konuşmalar, sonra o konuşmalara ait mesajların TEK
 * sorguda çekilip JavaScript'te gruplanması. `getOffersList`teki "sıralamayı
 * sunucuda yapamıyoruz, JS'te yapalım" kararıyla aynı mantık.
 *
 * Taşınan veri sınırlı: yalnızca özet için gereken üç kolon ve yalnızca
 * listelenen konuşmalar.
 */
export async function getConversations(filters: { search?: string } = {}): Promise<
  ConversationListItem[]
> {
  const supabase = await createClient();

  const conversations = rows<Omit<ConversationListItem, "preview" | "unread">>(
    await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .order("last_message_at", { ascending: false }),
    "Konuşma listesi",
  );

  if (conversations.length === 0) return [];

  const ids = conversations.map((conversation) => conversation.id);

  const messages = rows<{
    conversation_id: string;
    content: string;
    attachment_type: MessageAttachmentType | null;
    sender_type: MessageSender;
    read_at: string | null;
    created_at: string;
  }>(
    await supabase
      .from("messages")
      .select("conversation_id, content, attachment_type, sender_type, read_at, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false }),
    "Konuşma özetleri",
  );

  const preview = new Map<string, string>();
  const unread = new Map<string, number>();

  for (const message of messages) {
    /* Mesajlar en yeniden eskiye sıralı; ilk gördüğümüz o konuşmanın sonu. */
    if (!preview.has(message.conversation_id)) {
      preview.set(
        message.conversation_id,
        message.content.trim() ||
          (message.attachment_type === "image" ? "📷 Fotoğraf" : "📎 Dosya"),
      );
    }

    /* Okunmamış = MÜŞTERİDEN gelen ve okunmamış. Danışmanın kendi gönderdiği
       mesajın "okunmamış" olması anlamsız — onu zaten kendisi yazdı. */
    if (message.sender_type === "customer" && message.read_at === null) {
      unread.set(
        message.conversation_id,
        (unread.get(message.conversation_id) ?? 0) + 1,
      );
    }
  }

  const list = conversations.map((conversation) => ({
    ...conversation,
    preview: preview.get(conversation.id) ?? "Henüz mesaj yok",
    unread: unread.get(conversation.id) ?? 0,
  }));

  /* Arama SUNUCUDA DEĞİL burada: aranan alan gömülü ilişkide
     (`customers.full_name`) ve PostgREST gömülü kolona `or()` filtresi
     uygulayamıyor. Liste zaten ekrana sığacak boyutta. */
  const term = filters.search?.trim().toLocaleLowerCase("tr-TR");
  if (!term) return list;

  return list.filter(
    (item) =>
      item.customer?.full_name.toLocaleLowerCase("tr-TR").includes(term) ||
      item.preview.toLocaleLowerCase("tr-TR").includes(term),
  );
}

export async function getConversationById(
  id: string,
): Promise<ConversationListItem | null> {
  const supabase = await createClient();

  const conversation = maybeRow<Omit<ConversationListItem, "preview" | "unread">>(
    await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .eq("id", id)
      .maybeSingle(),
    "Konuşma",
  );

  if (!conversation) return null;
  return { ...conversation, preview: "", unread: 0 };
}

/* ==========================================================================
   Mesajlar
   ========================================================================== */

export type MessageItem = {
  id: string;
  conversation_id: string;
  sender_type: MessageSender;
  content: string;
  attachment_url: string | null;
  attachment_type: MessageAttachmentType | null;
  created_at: string;
  read_at: string | null;
  /**
   * Ekin imzalı indirme adresi — SÜRELİ (60 sn).
   *
   * Kolonun kendisi private bucket'taki nesne yolunu taşıyor; kalıcı bir URL
   * yok. Bu alan sunucuda üretiliyor ve sayfa her çizildiğinde yenileniyor.
   */
  attachment_signed_url: string | null;
};

/**
 * Bir konuşmanın mesajları, eskiden yeniye.
 *
 * Sıralama KRONOLOJİK çünkü sohbet öyle okunuyor; liste sayfalarındaki "en
 * yeni üstte" kuralı burada geçerli değil.
 */
export async function getMessages(conversationId: string): Promise<MessageItem[]> {
  const supabase = await createClient();

  const messages = rows<Omit<MessageItem, "attachment_signed_url">>(
    await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_type, content, attachment_url, attachment_type, created_at, read_at",
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    "Mesajlar",
  );

  /* Ekler TEK ÇAĞRIDA imzalanıyor: mesaj başına imzalamak 30 mesajlık bir
     sohbette 30 ağ turu demekti. Eki olmayan sohbette hiç çağrı yapılmıyor. */
  const paths = messages
    .map((message) => message.attachment_url)
    .filter((path): path is string => Boolean(path));

  const signed = await signedUrlsFor(paths);

  return messages.map((message) => ({
    ...message,
    attachment_signed_url: message.attachment_url
      ? (signed.get(message.attachment_url) ?? null)
      : null,
  }));
}

/* ==========================================================================
   Sayaçlar
   ========================================================================== */

/**
 * Sidebar rozetindeki okunmamış mesaj sayısı.
 *
 * HATA FIRLATMIYOR. Bu sayım LAYOUT'ta çalışıyor (gezinme rozeti her sayfada
 * var); bir istisna tek bir bileşeni değil uygulamanın tamamını hata ekranına
 * düşürürdü. `data/notifications.ts` ve `getCurrentAgent()` aynı gerekçeyle
 * aynı kararı verdi: layout'ta okunan bir şeyin okunamaması uygulamayı
 * çökertmemeli. Rozet görünmez, sorun günlüğe yazılır.
 *
 * Kapsamı RLS belirliyor: danışman yalnızca kendi konuşmalarındaki
 * okunmamışları sayıyor.
 */
export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_type", "customer")
    .is("read_at", null);

  if (error) {
    console.error(`[messages] okunmamış sayacı okunamadı: ${error.message}`);
    return 0;
  }

  return count ?? 0;
}
