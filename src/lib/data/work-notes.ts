import type {
  WorkNoteAttachmentType,
  WorkNoteStatus,
  WorkNoteType,
} from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth/server";
import { rows } from "@/lib/data/query";
import { signedUrlsFor } from "@/lib/storage/signed";
import type { WorkNoteQuery } from "@/lib/work-notes";

/**
 * ============================================================================
 * İŞ NOTU VERİ ERİŞİMİ
 * ============================================================================
 * Aynı veri ÜÇ YERDE gösteriliyor: `/mesajlar` panosu, müşteri detayı ve ilan
 * detayı. Üçü de aynı satır şeklini istiyor, o yüzden tek bir `WorkNoteItem`
 * var ve üç fonksiyon aynı `SELECT`i paylaşıyor.
 *
 * -----------------------------------------------------------------------------
 * YANITLAR NEDEN AYRI SORGUDA
 * -----------------------------------------------------------------------------
 * `work_notes` kendine referans veriyor (`parent_note_id`) ve PostgREST bir
 * tabloyu KENDİNE gömerken ilişkiyi çözemiyor — üstelik gömülü ilişkiyi
 * sınırlayamıyor da. Faz 12'deki konuşma özetlerinde uygulanan çözümün aynısı:
 * önce üst notlar, sonra o notlara ait yanıtların TEK sorguda çekilip
 * JavaScript'te gruplanması. İki tur, N+1 değil.
 *
 * -----------------------------------------------------------------------------
 * RLS GÖRÜNMEZ AMA ETKİLİ
 * -----------------------------------------------------------------------------
 * `work_notes_scoped` (0012) dört yoldan kapsam kuruyor: yönetici, notu yazan,
 * notta anılan ve bağlı kaydın sahibi. Sorguların hiçbiri ayrıca sahiplik
 * filtresi koymuyor — koysaydı kural iki yerde yaşardı.
 */

/* ==========================================================================
   Satır şekli
   ========================================================================== */

type NoteAgent = {
  id: string;
  full_name: string;
  initials: string;
  avatar_url: string | null;
} | null;

export type WorkNoteItem = {
  id: string;
  note_type: WorkNoteType;
  content: string;
  status: WorkNoteStatus | null;
  created_at: string;
  resolved_at: string | null;
  parent_note_id: string | null;

  customer_id: string | null;
  listing_id: string | null;

  attachment_url: string | null;
  attachment_type: WorkNoteAttachmentType | null;

  author: NoteAgent;
  mentioned: NoteAgent;
  resolver: NoteAgent;

  customer: { id: string; full_name: string } | null;
  listing: { id: string; title: string } | null;
};

/** Üst not + kendisine verilen yanıtlar. Pano ve detay bölümleri bunu çiziyor. */
export type WorkNoteThread = WorkNoteItem & {
  replies: WorkNoteItem[];
  /**
   * Ekin imzalı indirme adresi — SÜRELİ (60 sn).
   *
   * Kolon private bucket'taki nesne yolunu taşıyor, kalıcı adres yok. Liste
   * hepsini ÖNDEN imzalıyor (`data/documents.ts`teki tersine karar): iş
   * notundaki ek sohbet balonu gibi satırın içinde çiziliyor, yani tıklama
   * olmadan da adres gerekiyor.
   */
  attachment_signed_url: string | null;
  replies_signed: Map<string, string>;
};

/* Aynı `agents` tablosuna ÜÇ yabancı anahtar var; PostgREST hangisini
   gömeceğini kısıt adından öğreniyor. Ad verilmezse sorgu belirsizlik hatası
   döner — `documents.ts`teki aynı durum. */
const NOTE_SELECT = `
  id, note_type, content, status, created_at, resolved_at, parent_note_id,
  customer_id, listing_id, attachment_url, attachment_type,
  author:agents!work_notes_author_agent_id_fkey(id, full_name, initials, avatar_url),
  mentioned:agents!work_notes_mentioned_agent_id_fkey(id, full_name, initials, avatar_url),
  resolver:agents!work_notes_resolved_by_agent_id_fkey(id, full_name, initials, avatar_url),
  customer:customers!work_notes_customer_id_fkey(id, full_name),
  listing:listings!work_notes_listing_id_fkey(id, title)
`;

/* ==========================================================================
   Ortak yardımcılar
   ========================================================================== */

/** Üst notlara yanıtlarını iliştirir ve tüm ekleri TEK çağrıda imzalar. */
async function toThreads(parents: WorkNoteItem[]): Promise<WorkNoteThread[]> {
  if (parents.length === 0) return [];

  const supabase = await createClient();

  const replies = rows<WorkNoteItem>(
    await supabase
      .from("work_notes")
      .select(NOTE_SELECT)
      .in(
        "parent_note_id",
        parents.map((note) => note.id),
      )
      .order("created_at", { ascending: true }),
    "İş notu yanıtları",
  );

  const byParent = new Map<string, WorkNoteItem[]>();
  for (const reply of replies) {
    if (!reply.parent_note_id) continue;
    const list = byParent.get(reply.parent_note_id) ?? [];
    list.push(reply);
    byParent.set(reply.parent_note_id, list);
  }

  /* Ekler TEK ÇAĞRIDA imzalanıyor — üst notlar ve yanıtlar birlikte. Not
     başına imzalamak 20 satırlık bir panoda 20 ağ turu demekti; eki olmayan
     panoda hiç çağrı yapılmıyor. */
  const paths = [...parents, ...replies]
    .map((note) => note.attachment_url)
    .filter((path): path is string => Boolean(path));

  const signed = await signedUrlsFor(paths);

  return parents.map((parent) => {
    const own = byParent.get(parent.id) ?? [];
    const repliesSigned = new Map<string, string>();
    for (const reply of own) {
      const url = reply.attachment_url && signed.get(reply.attachment_url);
      if (url) repliesSigned.set(reply.id, url);
    }

    return {
      ...parent,
      replies: own,
      attachment_signed_url: parent.attachment_url
        ? (signed.get(parent.attachment_url) ?? null)
        : null,
      replies_signed: repliesSigned,
    };
  });
}

/**
 * Arama JAVASCRIPT'TE.
 *
 * Aranan üç alanın ikisi GÖMÜLÜ ilişkide (`customers.full_name`,
 * `listings.title`) ve PostgREST `or()` filtresini gömülü kolona
 * uygulayamıyor. Yalnızca `content` sunucuda aransaydı, müşteri adını yazan
 * kullanıcı hiçbir şey bulamazdı — yarım çalışan bir arama, çalışmayandan
 * kötü. Liste zaten `limit` ile sınırlı.
 */
function matchesSearch(note: WorkNoteThread, term: string): boolean {
  const haystack = [
    note.content,
    note.customer?.full_name ?? "",
    note.listing?.title ?? "",
    note.author?.full_name ?? "",
    ...note.replies.map((reply) => reply.content),
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return haystack.includes(term);
}

/* ==========================================================================
   Pano
   ========================================================================== */

/**
 * `/mesajlar` panosundaki liste.
 *
 * YALNIZCA ÜST NOTLAR (`parent_note_id is null`): yanıtlar kendi satırlarını
 * almıyor, ait oldukları notun altında çiziliyor. Aksi hâlde bir soru ve üç
 * cevabı panoda dört ayrı satır olurdu ve "açık soru" sayısı anlamını
 * yitirirdi.
 */
export async function getWorkNotes(
  query: WorkNoteQuery,
  limit = 60,
): Promise<WorkNoteThread[]> {
  const supabase = await createClient();

  let statement = supabase
    .from("work_notes")
    .select(NOTE_SELECT)
    .is("parent_note_id", null);

  switch (query.filter) {
    case "open":
      statement = statement.eq("status", "open");
      break;
    case "resolved":
      statement = statement.eq("status", "resolved");
      break;
    case "mine": {
      /* "Bana yönelik" = beni ANAN notlar. Sorumluluğumdaki kayıtlara yazılan
         notlar buraya girmiyor; onlar zaten "Tüm ekip"te ve iki sekmenin aynı
         listeyi göstermesi sekmeyi işlevsiz kılardı (`lib/work-notes.ts`). */
      const agent = await getCurrentAgent();
      if (!agent?.is_active) return [];
      statement = statement.eq("mentioned_agent_id", agent.id);
      break;
    }
    case "all":
      break;
  }

  if (query.type) statement = statement.eq("note_type", query.type);

  const parents = rows<WorkNoteItem>(
    await statement.order("created_at", { ascending: false }).limit(limit),
    "İş notları",
  );

  const threads = await toThreads(parents);

  const term = query.search?.toLocaleLowerCase("tr-TR");
  if (!term) return threads;

  return threads.filter((note) => matchesSearch(note, term));
}

/* ==========================================================================
   Kayda bağlı listeler
   ========================================================================== */

/**
 * Müşteri detayındaki "İş Notları" bölümü.
 *
 * Pano ile AYNI VERİ, farklı bağlam — Faz 18'in ana fikri bu. Ayrı bir sorgu
 * gerekiyor çünkü burada filtre yok: kayda yazılmış her not görünüyor, açık
 * da çözülmüş de.
 */
export async function getWorkNotesForCustomer(
  customerId: string,
  limit = 20,
): Promise<WorkNoteThread[]> {
  const supabase = await createClient();

  const parents = rows<WorkNoteItem>(
    await supabase
      .from("work_notes")
      .select(NOTE_SELECT)
      .eq("customer_id", customerId)
      .is("parent_note_id", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    "Müşteri iş notları",
  );

  return toThreads(parents);
}

export async function getWorkNotesForListing(
  listingId: string,
  limit = 20,
): Promise<WorkNoteThread[]> {
  const supabase = await createClient();

  const parents = rows<WorkNoteItem>(
    await supabase
      .from("work_notes")
      .select(NOTE_SELECT)
      .eq("listing_id", listingId)
      .is("parent_note_id", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    "İlan iş notları",
  );

  return toThreads(parents);
}

/* ==========================================================================
   Sayaç
   ========================================================================== */

/**
 * Sidebar "Mesajlar" rozetindeki sayı.
 *
 * -----------------------------------------------------------------------------
 * NE SAYIYOR — FAZ 18'DE DEĞİŞTİ
 * -----------------------------------------------------------------------------
 * Eskiden "okunmamış mesaj" sayıyordu. Mesaj kavramı kalkınca rozetin de neyi
 * göstereceği değişti: BANA YÖNELİK AÇIK İŞ. Yani biri beni anmış ve o not
 * hâlâ çözülmemiş.
 *
 * "Okunmadı" değil "açık" sayılıyor ve bu bilinçli bir sadeleşme: bir okundu
 * damgası daha izlemek yerine, notun kendi yaşam döngüsü rozeti besliyor.
 * Kullanıcı notu okusa bile iş bitmiyor — soru hâlâ cevap bekliyor. Rozetin
 * düşmesi, işin bitmesiyle oluyor.
 *
 * HATA FIRLATMIYOR. Bu sayım LAYOUT'ta çalışıyor (rozet her sayfada var);
 * bir istisna tek bir bileşeni değil uygulamanın tamamını hata ekranına
 * düşürürdü. `data/notifications.ts` ve `getCurrentAgent()` aynı gerekçeyle
 * aynı kararı verdi.
 */
export async function getOpenWorkNoteCount(): Promise<number> {
  const agent = await getCurrentAgent();
  if (!agent?.is_active) return 0;

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("work_notes")
    .select("id", { count: "exact", head: true })
    .eq("mentioned_agent_id", agent.id)
    .eq("status", "open");

  if (error) {
    console.error(`[work-notes] açık not sayacı okunamadı: ${error.message}`);
    return 0;
  }

  return count ?? 0;
}

/* ==========================================================================
   Form seçenekleri
   ========================================================================== */

export type WorkNoteFormOptions = {
  customers: { id: string; label: string }[];
  listings: { id: string; label: string }[];
  /** @mention açılırı — kendim listede yokum, kendime soru sormam. */
  agents: { id: string; label: string }[];
};

/**
 * Not formundaki üç açılır.
 *
 * Dar sorgular: yalnızca kimlik ve etiket çekiliyor. `data/documents.ts` ve
 * `data/appointments.ts` ile aynı gerekçe — bir açılırı doldurmak için tüm
 * satırı taşımak gereksiz.
 */
export async function getWorkNoteFormOptions(): Promise<WorkNoteFormOptions> {
  const supabase = await createClient();
  const me = await getCurrentAgent();

  const [customerRows, listingRows, agentRows] = await Promise.all([
    supabase.from("customers").select("id, full_name").order("full_name"),
    supabase
      .from("listings")
      .select("id, title")
      .order("created_at", { ascending: false }),
    supabase
      .from("agents")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return {
    customers: rows<{ id: string; full_name: string }>(
      customerRows,
      "Not formu müşterileri",
    ).map((customer) => ({ id: customer.id, label: customer.full_name })),

    listings: rows<{ id: string; title: string }>(
      listingRows,
      "Not formu ilanları",
    ).map((listing) => ({ id: listing.id, label: listing.title })),

    /* PASİF PERSONEL LİSTEDE YOK: kimse cevaplamayacak bir soruyu birine
       yöneltmemeli. Kendim de yokum — kendime not bırakmak bir hatırlatma,
       bu modülün işi değil. */
    agents: rows<{ id: string; full_name: string }>(
      agentRows,
      "Not formu personelleri",
    )
      .filter((agent) => agent.id !== me?.id)
      .map((agent) => ({ id: agent.id, label: agent.full_name })),
  };
}
