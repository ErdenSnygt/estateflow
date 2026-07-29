"use server";

import { revalidatePath } from "next/cache";

import type { MessageAttachmentType, MessageSender } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import { notify } from "@/lib/actions/notify";
import { removeDocumentObjects } from "@/lib/storage/cleanup";
import { fail, ok, toMessage, type ActionResult } from "@/lib/actions/result";

/**
 * ============================================================================
 * MESAJ YAZMA İŞLEMLERİ
 * ============================================================================
 * Yazışma müşterinin kendisine ait (`conversations.customer_id` unique) ve
 * konuşma İLK MESAJDA doğuyor — boş konuşma kaydı üretilmiyor. Bir müşteriye
 * ilk kez yazan danışman aynı çağrıda hem konuşmayı hem mesajı oluşturuyor.
 */

function revalidateMessaging(customerId?: string | null) {
  revalidatePath("/mesajlar");
  /* Navbar rozeti her sayfada duruyor; layout'u besleyen sorgu tazelensin. */
  revalidatePath("/", "layout");
  if (customerId) revalidatePath(`/musteriler/${customerId}`);
}

/* ==========================================================================
   Konuşma açma
   ========================================================================== */

/**
 * Müşterinin konuşmasını bulur, yoksa açar.
 *
 * `upsert` KULLANILMIYOR: `customer_id` unique olduğu için upsert çalışırdı
 * ama mevcut konuşmanın `agent_id`sini de ezerdi — müşteriye yazan bir
 * yönetici, yazışmayı danışmandan kendi üzerine almış olurdu.
 */
async function ensureConversation(
  customerId: string,
): Promise<{ ok: true; id: string; agentId: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("conversations")
    .select("id, agent_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (readError) return { ok: false, error: toMessage(readError) };
  if (existing) return { ok: true, id: existing.id, agentId: existing.agent_id };

  /* Yeni konuşmanın sahibi MÜŞTERİNİN DANIŞMANI, yazan kişi değil. Bir
     yönetici müşteriye yazdığında yazışma yine ilgili danışmanda kalıyor;
     `offers.ts`teki "prim ilanın sahibine gider" kuralıyla aynı yaklaşım. */
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, assigned_agent_id")
    .eq("id", customerId)
    .maybeSingle();

  if (customerError) return { ok: false, error: toMessage(customerError) };
  if (!customer) return { ok: false, error: "Müşteri bulunamadı." };

  const { data, error } = await supabase
    .from("conversations")
    .insert({ customer_id: customer.id, agent_id: customer.assigned_agent_id })
    .select("id, agent_id")
    .single();

  if (error) {
    /* Yarış durumu: iki istek aynı anda ilk mesajı yazarsa ikincisi unique
       kısıta takılır. Hata döndürmek yerine mevcut satırı okuyoruz —
       kullanıcı açısından ikisi de "konuşma açıldı". */
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("conversations")
        .select("id, agent_id")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (raced) return { ok: true, id: raced.id, agentId: raced.agent_id };
    }
    return { ok: false, error: toMessage(error) };
  }

  return { ok: true, id: data.id, agentId: data.agent_id };
}

/** Müşteri detayından "Mesaj gönder" düğmesi için — konuşmayı açıp kimliğini döner. */
export async function openConversation(
  customerId: string,
): Promise<ActionResult<{ id: string }>> {
  const result = await ensureConversation(customerId);
  if (!result.ok) return fail(result.error);

  revalidateMessaging(customerId);
  return ok({ id: result.id });
}

/* ==========================================================================
   Mesaj gönderme
   ========================================================================== */

export type SendMessageInput = {
  /** İkisinden biri zorunlu: mevcut konuşma ya da müşteri (konuşma açılır). */
  conversationId?: string;
  customerId?: string;
  content: string;
  /** Private bucket'taki nesne yolu — `uploadDocument()` çıktısı. */
  attachmentPath?: string | null;
  attachmentType?: MessageAttachmentType | null;
  /** Gelen mesajı elle kaydetmek için; varsayılan danışman tarafı. */
  senderType?: MessageSender;
};

export async function sendMessage(
  input: SendMessageInput,
): Promise<ActionResult<{ id: string; conversationId: string }>> {
  const content = input.content.trim();
  const hasAttachment = Boolean(input.attachmentPath);

  if (!content && !hasAttachment) {
    return fail("Boş mesaj gönderilemez.");
  }
  if (hasAttachment && !input.attachmentType) {
    return fail("Ek türü belirlenemedi.");
  }

  let conversationId = input.conversationId;
  let conversationAgentId: string | null = null;
  let customerId = input.customerId ?? null;

  if (!conversationId) {
    if (!customerId) return fail("Konuşma ya da müşteri belirtilmedi.");
    const opened = await ensureConversation(customerId);
    if (!opened.ok) return fail(opened.error);
    conversationId = opened.id;
    conversationAgentId = opened.agentId;
  }

  const supabase = await createClient();

  if (!conversationAgentId || !customerId) {
    /* Konuşma kimliği dışarıdan geldiyse sahibi ve müşterisi bilinmiyor.
       Okuma RLS'e tabi: kullanıcı göremediği bir konuşmaya yazamaz. */
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("id, agent_id, customer_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (error) return fail(toMessage(error));
    if (!conversation) return fail("Konuşma bulunamadı.");

    conversationAgentId = conversation.agent_id;
    customerId = conversation.customer_id;
  }

  const senderType: MessageSender = input.senderType ?? "agent";

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: senderType,
      content,
      attachment_url: input.attachmentPath ?? null,
      attachment_type: hasAttachment ? (input.attachmentType ?? null) : null,
      /* Danışmanın kendi yazdığı mesaj baştan okunmuş sayılıyor: okunmamış
         sayacı yalnızca MÜŞTERİDEN geleni sayıyor (`data/messages.ts`). */
      read_at: senderType === "agent" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    /* Yazma başarısızsa yüklenmiş ek yetim kalır — hemen temizleniyor.
       `actions/listings.ts`teki silme cascade'i ile aynı sorumluluk. */
    if (input.attachmentPath) {
      await removeDocumentObjects([input.attachmentPath]);
    }
    return fail(toMessage(error));
  }

  /* Liste sıralaması bu kolondan; güncellenmezse yeni mesaj gelen konuşma
     listenin dibinde kalır. */
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  /* BİLDİRİM YALNIZCA MÜŞTERİDEN GELEN MESAJDA. Danışmanın kendi gönderdiği
     mesaj için kendine bildirim yazmak gürültü olurdu; `notify()` zaten
     `actorAgentId` eşleşmesinde atlıyor ama niyeti burada da açık tutuyoruz. */
  if (senderType === "customer") {
    const { data: customer } = await supabase
      .from("customers")
      .select("full_name")
      .eq("id", customerId)
      .maybeSingle();

    await notify(supabase, {
      agentId: conversationAgentId,
      type: "message_received",
      title: `${customer?.full_name ?? "Müşteri"} mesaj gönderdi`,
      description: content.slice(0, 120) || "Bir ek paylaştı.",
      entityType: "conversation",
      entityId: conversationId,
    });
  }

  revalidateMessaging(customerId);
  return ok({ id: data.id, conversationId });
}

/* ==========================================================================
   Okundu işaretleme
   ========================================================================== */

/**
 * Konuşma açıldığında müşteriden gelen okunmamışları okundu yapar.
 *
 * Koşula `read_at is null` ekli: zaten okunmuş satırları tekrar damgalamak
 * hem gereksiz yazma hem de "ne zaman okundu" bilgisini bozardı.
 */
export async function markConversationRead(
  conversationId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("sender_type", "customer")
    .is("read_at", null);

  if (error) return fail(toMessage(error));

  revalidateMessaging();
  return ok({ id: conversationId });
}

/* ==========================================================================
   Silme
   ========================================================================== */

/** Mesaj silme — ek varsa dosyası da gider. */
export async function deleteMessage(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const agent = await getCurrentAgent();
  if (!agent?.is_active) return fail("Bu işlem için yetkiniz yok.");

  const { data: message } = await supabase
    .from("messages")
    .select("id, attachment_url, conversation_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) return fail(toMessage(error));

  if (message?.attachment_url) {
    await removeDocumentObjects([message.attachment_url]);
  }

  revalidateMessaging();
  return ok({ id });
}
