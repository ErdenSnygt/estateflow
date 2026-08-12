"use server";

import { revalidatePath } from "next/cache";

import type {
  WorkNoteAttachmentType,
  WorkNoteType,
} from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import { notify } from "@/lib/actions/notify";
import { removeDocumentObjects } from "@/lib/storage/cleanup";
import { initialStatusFor } from "@/lib/work-notes";
import {
  fail,
  ok,
  toMessage,
  type ActionErrorSource,
  type ActionResult,
} from "@/lib/actions/result";

/**
 * ============================================================================
 * İŞ NOTU İŞLEMLERİ
 * ============================================================================
 * Faz 12'deki `actions/messages.ts`in yerini aldı. En büyük fark, bu modülün
 * yalnızca not yazmakla kalmayıp BAŞKA TABLOLARI DEĞİŞTİRMESİ: bir "atama"
 * notu, bağlı kaydın sorumlusunu gerçekten devrediyor.
 *
 * -----------------------------------------------------------------------------
 * ATAMA NEDEN GÖRSEL DEĞİL
 * -----------------------------------------------------------------------------
 * "Ahmet Bey'i ben üstleniyorum" yazan bir not, `customers.assigned_agent_id`
 * hâlâ eski danışmanı gösterirken duruyorsa YALAN SÖYLÜYOR demektir. İki ayrı
 * doğruluk kaynağı doğar: kaydın kendisi bir şey söyler, notlar başka bir şey.
 * Faz 12'nin `messages` tablosu tam olarak bu hataya düşmüştü — görünen ama
 * hiçbir yere ulaşmayan bir özellik.
 *
 * Devir bu yüzden notun YAN ETKİSİ değil, notun KENDİSİ: kayıt güncellenemezse
 * not da yazılmıyor (aşağıda, sıralamanın gerekçesi).
 */

function revalidateNotes(customerId?: string | null, listingId?: string | null) {
  revalidatePath("/mesajlar");
  /* Sidebar rozeti her sayfada duruyor; layout'u besleyen sayaç tazelensin. */
  revalidatePath("/", "layout");
  if (customerId) revalidatePath(`/musteriler/${customerId}`);
  if (listingId) revalidatePath(`/ilanlar/${listingId}`);
}

/** Notun bağlı olduğu kaydın okunabilir adı — bildirim metinlerinde geçiyor. */
async function contextLabel(
  customerId: string | null,
  listingId: string | null,
): Promise<string> {
  const supabase = await createClient();

  if (customerId) {
    const { data } = await supabase
      .from("customers")
      .select("full_name")
      .eq("id", customerId)
      .maybeSingle();
    if (data) return data.full_name;
  }

  if (listingId) {
    const { data } = await supabase
      .from("listings")
      .select("title")
      .eq("id", listingId)
      .maybeSingle();
    if (data) return data.title;
  }

  return "bir kayıt";
}

/* ==========================================================================
   Devir
   ========================================================================== */

type Handoff = {
  /** Devir öncesi sorumlu — bildirim ona gidiyor. */
  previousAgentId: string | null;
  newAgentId: string;
};

/**
 * Kaydın sorumlusunu değiştirir.
 *
 * MÜŞTERİ VE İLAN AYRI KOLONLAR taşıyor (`assigned_agent_id` / `agent_id`);
 * ikisini tek bir yardımcıda toplamak, kolon adını değişkenden okumayı
 * gerektirirdi ve şema generic'i o noktada tip denetimini bırakırdı. İki kısa
 * dal, bir soyutlamadan iyi.
 *
 * RLS: devir `customers_handoff` / `listings_handoff` politikalarından geçiyor
 * (0012). Danışman KENDİ kaydını başkasına verebiliyor, başkasınınkine
 * dokunamıyor.
 */
async function handOver(
  customerId: string | null,
  listingId: string | null,
  newAgentId: string,
): Promise<
  { ok: true; handoffs: Handoff[] } | { ok: false; error: ActionErrorSource }
> {
  const supabase = await createClient();
  const handoffs: Handoff[] = [];

  if (customerId) {
    const { data: current, error: readError } = await supabase
      .from("customers")
      .select("assigned_agent_id")
      .eq("id", customerId)
      .maybeSingle();

    if (readError) return { ok: false, error: toMessage(readError) };
    if (!current) return { ok: false, error: "customerNotFound" };

    if (current.assigned_agent_id !== newAgentId) {
      const { error } = await supabase
        .from("customers")
        .update({ assigned_agent_id: newAgentId })
        .eq("id", customerId);

      if (error) {
        /* En olası neden RLS: kaydın şu anki sahibi ben değilim ve yönetici
           de değilim. Mesaj bunu söylüyor — ham Postgres hatası kullanıcıya
           hiçbir şey anlatmazdı. */
        return {
          ok: false,
          error:
            "noteHandoffCustomerForbidden",
        };
      }

      handoffs.push({
        previousAgentId: current.assigned_agent_id,
        newAgentId,
      });
    }
  }

  if (listingId) {
    const { data: current, error: readError } = await supabase
      .from("listings")
      .select("agent_id")
      .eq("id", listingId)
      .maybeSingle();

    if (readError) return { ok: false, error: toMessage(readError) };
    if (!current) return { ok: false, error: "listingNotFound" };

    if (current.agent_id !== newAgentId) {
      const { error } = await supabase
        .from("listings")
        .update({ agent_id: newAgentId })
        .eq("id", listingId);

      if (error) {
        return {
          ok: false,
          error:
            "noteHandoffListingForbidden",
        };
      }

      handoffs.push({ previousAgentId: current.agent_id, newAgentId });
    }
  }

  return { ok: true, handoffs };
}

/* ==========================================================================
   Not oluşturma
   ========================================================================== */

export type CreateWorkNoteInput = {
  /** İkisinden EN AZ BİRİ zorunlu — şema kısıtı da aynısını söylüyor. */
  customerId?: string | null;
  listingId?: string | null;
  type: WorkNoteType;
  content: string;
  /**
   * Soru/notta ANILAN kişi, atamada DEVRALAN kişi.
   *
   * Tek kolonun iki işi var ve bu bilinçli: ikisi de "bu not kimi
   * ilgilendiriyor" sorusunu yanıtlıyor. Ayrı bir `assignee_agent_id` kolonu,
   * her satırda biri boş duran iki kolon demekti — `notifications` tablosunun
   * polimorfik bağında verilen kararla aynı gerekçe.
   */
  mentionedAgentId?: string | null;
  /** Private bucket'taki nesne yolu — `uploadDocument()` çıktısı. */
  attachmentPath?: string | null;
  attachmentType?: WorkNoteAttachmentType | null;
  /** Doluysa bu bir YANIT; türü zorla `note` olur. */
  parentNoteId?: string | null;
};

export async function createWorkNote(
  input: CreateWorkNoteInput,
): Promise<ActionResult<{ id: string }>> {
  const content = input.content.trim();
  const hasAttachment = Boolean(input.attachmentPath);

  const abort = async (
    source: ActionErrorSource,
    values?: Record<string, string | number>,
  ) => {
    /* Kayıt açılmayacaksa yüklenmiş ek YETİM KALIR — hemen temizleniyor.
       `actions/documents.ts`teki aynı sorumluluk. */
    if (input.attachmentPath) {
      await removeDocumentObjects([input.attachmentPath]);
    }
    return fail(source, values);
  };

  if (!content && !hasAttachment) {
    return abort("noteEmpty");
  }
  if (hasAttachment && !input.attachmentType) {
    return abort("noteAttachmentTypeUnknown");
  }

  const agent = await getCurrentAgent();
  if (!agent?.is_active) {
    return abort("noteAgentNotFound");
  }

  const supabase = await createClient();

  let customerId = input.customerId || null;
  let listingId = input.listingId || null;
  let type = input.type;
  let mentionedAgentId = input.mentionedAgentId || null;

  /* --- Yanıt: bağlamı üst nottan devralıyor -------------------------------
     Kullanıcıya "hangi müşteriye cevap veriyorsun" diye sormak anlamsız —
     zaten belli. Devralmak aynı zamanda bir güvenlik adımı: yanıt, üst notun
     bağlamından kopup başka bir kaydın altına düşemiyor. */
  if (input.parentNoteId) {
    const { data: parent, error } = await supabase
      .from("work_notes")
      .select("id, customer_id, listing_id, parent_note_id")
      .eq("id", input.parentNoteId)
      .maybeSingle();

    if (error) return abort(toMessage(error));
    if (!parent) return abort("noteParentNotFound");
    if (parent.parent_note_id) {
      return abort("noteReplyToReply");
    }

    customerId = parent.customer_id;
    listingId = parent.listing_id;
    /* Yanıt her zaman genel not: kendi açık/çözülmüş durumu olmamalı, yoksa
       bir soruyu cevaplamak panoya ikinci bir açık madde eklerdi. */
    type = "note";
    mentionedAgentId = null;
  }

  if (!customerId && !listingId) {
    return abort("noteContextRequired");
  }

  /* --- Devralan personel doğrulaması ------------------------------------- */
  if (mentionedAgentId) {
    const { data: target } = await supabase
      .from("agents")
      .select("id, is_active, full_name")
      .eq("id", mentionedAgentId)
      .maybeSingle();

    if (!target) return abort("noteTargetNotFound");
    if (!target.is_active) {
      /* Şema bunu denetleyemiyor (yabancı anahtar varlığı garantiliyor,
         aktifliği değil) — gerekçe `0012_work_notes.sql` bölüm 7. */
      return abort("noteTargetInactive", { name: target.full_name });
    }
  }

  /* --- ATAMA: önce devir, sonra not ---------------------------------------
     SIRA ÖNEMLİ. Not önce yazılsaydı ve devir RLS'e takılsaydı, panoda
     "üstleniyorum" diyen ama hiçbir şeyi değiştirmemiş bir not kalırdı — tam
     olarak kaçınılan durum. Devir başarısızsa hiçbir şey yazılmıyor.

     DEVRALAN KİM: `mentionedAgentId` seçilmişse o, seçilmemişse notu yazan
     kişi. İkinci hâl "ben üstleniyorum", birincisi "bunu sana veriyorum". */
  let handoffs: Handoff[] = [];
  const assigneeId = type === "assignment" ? (mentionedAgentId ?? agent.id) : null;

  if (assigneeId) {
    const result = await handOver(customerId, listingId, assigneeId);
    if (!result.ok) return abort(result.error);
    handoffs = result.handoffs;
  }

  /* --- Durum --------------------------------------------------------------
     KENDİ ÜSTÜNE ALDIĞIN ATAMA AÇIK KALMIYOR: devir zaten oldu ve kabul
     edecek kimse yok. Başkasına yapılan atama, devralan "kabul et" diyene
     kadar açık duruyor — panodaki "Açık" sekmesi eyleme çağıran maddeleri
     göstersin diye. */
  const selfAssignment = type === "assignment" && assigneeId === agent.id;
  const status = selfAssignment ? "resolved" : initialStatusFor(type);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("work_notes")
    .insert({
      customer_id: customerId,
      listing_id: listingId,
      author_agent_id: agent.id,
      note_type: type,
      content,
      mentioned_agent_id: mentionedAgentId,
      status,
      resolved_at: status === "resolved" ? now : null,
      resolved_by_agent_id: status === "resolved" ? agent.id : null,
      parent_note_id: input.parentNoteId || null,
      attachment_url: input.attachmentPath ?? null,
      attachment_type: hasAttachment ? (input.attachmentType ?? null) : null,
    })
    .select("id")
    .single();

  if (error) return abort(toMessage(error));

  /* --- Bildirimler --------------------------------------------------------
     `notify()` istisna fırlatmıyor ve hedef kendisiyse satırı atlıyor
     (`actions/notify.ts`), yani aşağıdaki dallar "kendine bildirim" durumunu
     ayrıca elemek zorunda değil. */
  const label = await contextLabel(customerId, listingId);

  if (type === "assignment") {
    /* HEM ESKİ HEM YENİ SORUMLUYA. Eskisi kaydın elinden çıktığını, yenisi
       eline geçtiğini öğrenmeli — devri yapan kişi zaten biliyor ve
       `actorAgentId` onu eliyor. */
    for (const handoff of handoffs) {
      await notify(supabase, {
        agentId: handoff.previousAgentId,
        actorAgentId: agent.id,
        type: "work_note_assigned",
        title: `${label} kaydı devredildi`,
        description: content.slice(0, 120) || `${agent.full_name} kaydı üstlendi.`,
        entityType: "work_note",
        entityId: data.id,
      });
    }

    if (assigneeId && assigneeId !== agent.id) {
      await notify(supabase, {
        agentId: assigneeId,
        actorAgentId: agent.id,
        type: "work_note_assigned",
        title: `${label} kaydı sana devredildi`,
        description: content.slice(0, 120) || `${agent.full_name} kaydı sana verdi.`,
        entityType: "work_note",
        entityId: data.id,
      });
    }
  } else if (mentionedAgentId) {
    await notify(supabase, {
      agentId: mentionedAgentId,
      actorAgentId: agent.id,
      type: "work_note_mention",
      title: `${agent.full_name} sana bir ${type === "question" ? "soru sordu" : "not bıraktı"}`,
      description: content.slice(0, 120) || `${label} · bir ek paylaştı.`,
      entityType: "work_note",
      entityId: data.id,
    });
  }

  /* --- Yanıt geldiğinde soruyu SORANI haberdar et ------------------------- */
  if (input.parentNoteId) {
    const { data: parent } = await supabase
      .from("work_notes")
      .select("author_agent_id")
      .eq("id", input.parentNoteId)
      .maybeSingle();

    await notify(supabase, {
      agentId: parent?.author_agent_id,
      actorAgentId: agent.id,
      type: "work_note_mention",
      title: `${agent.full_name} notunu yanıtladı`,
      description: content.slice(0, 120) || `${label} · bir ek paylaştı.`,
      entityType: "work_note",
      entityId: input.parentNoteId,
    });
  }

  revalidateNotes(customerId, listingId);
  return ok({ id: data.id });
}

/* ==========================================================================
   Çözme
   ========================================================================== */

/**
 * Bir soruyu/atamayı kapatır.
 *
 * KİMLER ÇÖZEBİLİR: notu görebilen herkes. Soruyu soran cevabı aldığında
 * kapatır, cevaplayan da kapatabilir; atamayı devralan "kabul et" der. Kolon
 * bazlı kısıt Postgres'te satır politikasıyla ifade edilemiyor
 * (`0012_work_notes.sql` bölüm 4), ama burada daraltmaya gerek de yok — bir
 * notu kapatmak geri alınabilir bir işlem.
 */
export async function resolveWorkNote(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const agent = await getCurrentAgent();
  if (!agent?.is_active) return fail("noPermission");

  const supabase = await createClient();

  const { data: note, error: readError } = await supabase
    .from("work_notes")
    .select("id, status, note_type, author_agent_id, customer_id, listing_id")
    .eq("id", id)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!note) return fail("noteNotFoundOrForbidden");
  if (note.status !== "open") return fail("noteAlreadyResolved");

  const { error } = await supabase
    .from("work_notes")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by_agent_id: agent.id,
    })
    .eq("id", id);

  if (error) return fail(toMessage(error));

  /* SORUYU SORANA BİLDİRİM. Kendi notunu kapatan kişi için `notify()` zaten
     satır yazmıyor. */
  const label = await contextLabel(note.customer_id, note.listing_id);

  await notify(supabase, {
    agentId: note.author_agent_id,
    actorAgentId: agent.id,
    type: "work_note_resolved",
    title:
      note.note_type === "assignment"
        ? `${label} devri kabul edildi`
        : `${label} sorusu çözüldü`,
    description: `${agent.full_name} kapattı.`,
    entityType: "work_note",
    entityId: id,
  });

  revalidateNotes(note.customer_id, note.listing_id);
  return ok({ id });
}

/**
 * Kapatılmış bir notu tekrar açar.
 *
 * Çözmenin karşılığı olmadan "çözüldü" düğmesi tek yönlü bir kapıydı: yanlış
 * tıklayan kullanıcı notu silmek zorunda kalırdı. Yeniden açma bildirim
 * DOĞURMUYOR — kimseden yeni bir eylem beklenmiyor, yalnızca bir düzeltme.
 */
export async function reopenWorkNote(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const { data: note, error: readError } = await supabase
    .from("work_notes")
    .select("id, note_type, status, customer_id, listing_id")
    .eq("id", id)
    .maybeSingle();

  if (readError) return fail(toMessage(readError));
  if (!note) return fail("noteNotFoundOrForbidden");
  if (note.note_type === "note") {
    /* Genel notun durumu NULL; "açmak" şema kısıtını ihlal ederdi
       (`work_notes_status_matches_type`). Arayüz düğmeyi hiç çizmiyor, bu
       ikinci kapı. */
    return fail("noteNoStatus");
  }

  const { error } = await supabase
    .from("work_notes")
    .update({ status: "open", resolved_at: null, resolved_by_agent_id: null })
    .eq("id", id);

  if (error) return fail(toMessage(error));

  revalidateNotes(note.customer_id, note.listing_id);
  return ok({ id });
}

/* ==========================================================================
   Silme
   ========================================================================== */

/**
 * Not silme — eki ve yanıtları da gider.
 *
 * Yanıtlar veritabanı tarafından siliniyor (`on delete cascade`), ama
 * DOSYALARI silmiyor: Storage nesneleri şemanın dışında. Bu yüzden yollar
 * silmeden ÖNCE toplanıyor.
 *
 * ATAMA NOTU SİLİNSE DE DEVİR GERİ ALINMIYOR. Bilinçli: devir gerçek bir
 * olaydı, kaydın sorumlusu değişti ve o günden beri işler yeni sorumlu
 * üzerinden yürüdü. Notu silmek olayın kaydını siler, olayı değil — geri
 * almak isteyen yeni bir atama notu yazar.
 */
export async function deleteWorkNote(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const agent = await getCurrentAgent();
  if (!agent?.is_active) return fail("noPermission");

  const supabase = await createClient();

  const { data: note } = await supabase
    .from("work_notes")
    .select("id, attachment_url, customer_id, listing_id")
    .eq("id", id)
    .maybeSingle();

  const { data: replies } = await supabase
    .from("work_notes")
    .select("attachment_url")
    .eq("parent_note_id", id);

  const { error } = await supabase.from("work_notes").delete().eq("id", id);
  if (error) return fail(toMessage(error));

  const paths = [note?.attachment_url, ...(replies ?? []).map((r) => r.attachment_url)]
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) await removeDocumentObjects(paths);

  revalidateNotes(note?.customer_id, note?.listing_id);
  return ok({ id });
}
