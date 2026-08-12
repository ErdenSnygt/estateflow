import type { WorkNoteStatus, WorkNoteType } from "@/types/database";
import { single, type SearchParamsInput } from "@/lib/search-params";

/**
 * ============================================================================
 * İŞ NOTU SÖZLÜĞÜ VE SAF KURALLARI
 * ============================================================================
 * `lib/offers.ts`, `lib/appointments.ts` ve `lib/revenue.ts` ile aynı desende:
 * etiketler, tonlar ve veritabanı gerektirmeyen kurallar burada; veri katmanı
 * yalnızca ham değeri taşıyor.
 *
 * -----------------------------------------------------------------------------
 * BU MODÜL NEDEN "MESAJ" DEĞİL
 * -----------------------------------------------------------------------------
 * Faz 12'de `/mesajlar` bir danışman ↔ müşteri sohbetiydi ve sohbetin bir
 * tarafı hiç var olmadı: müşteriler uygulamaya girmiyor. Faz 18'de model
 * değişti — uygulama içinde gerçekten yürüyen iletişim EKİP İÇİ olanı ve her
 * zaman bir kayda bağlı. Gerekçenin tamamı `0012_work_notes.sql` başlığında.
 */

/* ==========================================================================
   Not türleri
   ========================================================================== */

/**
 * Türlerin SIRASI — açılırda bu sırayla çiziliyor.
 *
 * Etiketleri ve form ipuçları sözlükte (`workNotes.type.*`,
 * `workNotes.typeHint.*`); burada yalnızca yapı kaldı.
 */
export const WORK_NOTE_TYPES = [
  "question",
  "assignment",
  "note",
] as const satisfies readonly WorkNoteType[];

export const WORK_NOTE_TYPE_TONES: Record<
  WorkNoteType,
  "brand" | "warning" | "neutral"
> = {
  /* Soru `brand`: panoda gözün ilk gitmesi gereken şey, çünkü birinden bir
     eylem bekliyor. Atama `warning` çünkü bir sahiplik değişikliği — geri
     alınabilir ama fark edilmeden geçmemeli. Not sessiz kalıyor. */
  question: "brand",
  assignment: "warning",
  note: "neutral",
};

/* ==========================================================================
   Durum
   ========================================================================== */

export const WORK_NOTE_STATUS_TONES: Record<
  WorkNoteStatus,
  "warning" | "success"
> = {
  open: "warning",
  resolved: "success",
};

/**
 * Bir tür için başlangıç durumu.
 *
 * `note` için `null` DÖNÜYOR ve bu şemadaki kısıtın aynası
 * (`work_notes_status_matches_type`): genel bir notun açık/çözülmüş hâli yok.
 * Tek yerde hesaplanıyor ki form ile server action aynı kararı versin.
 */
export function initialStatusFor(type: WorkNoteType): WorkNoteStatus | null {
  return type === "note" ? null : "open";
}

/** Yalnızca açık bir not çözülebilir; genel notta düğme hiç çizilmiyor. */
export function canResolve(status: WorkNoteStatus | null): boolean {
  return status === "open";
}

/* ==========================================================================
   Pano filtreleri
   ========================================================================== */

/**
 * `/mesajlar` üstündeki dört sekme.
 *
 * URL'DE (`?f=`), bileşen durumunda değil — `/randevular` ve `/satislar` ile
 * aynı gerekçe: bağlantı paylaşılabilir, geri tuşu çalışır, liste sunucuda
 * çekilebilir.
 *
 * "Bana yönelik" HEM @mention HEM DE sorumluluğumdaki kayıtlara yazılanı
 * kapsamıyor — yalnızca @mention. Ayrımın sebebi: kendi müşterime yazılmış her
 * not zaten "Tüm ekip"te görünüyor; "Bana yönelik" sekmesi biri BENİ
 * işaretlediğinde anlamlı, yoksa iki sekme aynı listeyi gösterirdi.
 */
export const WORK_NOTE_FILTERS = [
  "open",
  "mine",
  "all",
  "resolved",
] as const;

export type WorkNoteFilter = (typeof WORK_NOTE_FILTERS)[number];

export const DEFAULT_WORK_NOTE_FILTER: WorkNoteFilter = "open";

export type WorkNoteQuery = {
  filter: WorkNoteFilter;
  type?: WorkNoteType;
  search?: string;
};

/**
 * URL parametrelerini sorguya çevirir.
 *
 * Tanınmayan değer HATA DEĞİL, varsayılana düşüyor — `search-params.ts`
 * başlığındaki ortak kural: elle düzenlenmiş bir link hata sayfası değil, yok
 * sayılmış bir filtre üretmeli.
 */
export function parseWorkNoteQuery(params: SearchParamsInput): WorkNoteQuery {
  const rawFilter = single(params, "f");
  const filter = WORK_NOTE_FILTERS.some((value) => value === rawFilter)
    ? (rawFilter as WorkNoteFilter)
    : DEFAULT_WORK_NOTE_FILTER;

  const rawType = single(params, "t");
  const type = WORK_NOTE_TYPES.some((value) => value === rawType)
    ? (rawType as WorkNoteType)
    : undefined;

  const search = single(params, "q")?.trim() || undefined;

  return { filter, type, search };
}

/* ==========================================================================
   @mention
   ========================================================================== */

/**
 * Bir danışman adının metin içindeki gösterimi.
 *
 * ASIL BAĞ BU METİN DEĞİL, `mentioned_agent_id` kolonu. Metindeki "@Mehmet"
 * yalnızca okuyanın gözü için: iki Mehmet olabilir, isim değişebilir ve
 * sidebar rozeti bir metin araması yapamaz. Ayrıştırma bu yüzden yalnızca
 * yazarken bir yardımcı — kaydedilen gerçek kimlik.
 */
export function mentionToken(fullName: string): string {
  /* Ad ve soyad arasındaki boşluk korunuyor: "@Mehmet Kaya" okunabilir,
     "@MehmetKaya" değil. Metin zaten sorgulanmıyor, biçim serbest. */
  return `@${fullName}`;
}

/**
 * İçeriğin başına bir @mention ekler — zaten varsa tekrar eklemez.
 *
 * Kullanıcı listeden bir kişi seçtiğinde metin kutusuna dokunulmasını
 * beklemek gereksiz bir adımdı; seçim metne de yansıyor. Tekrar kontrolü şart
 * çünkü seçim değiştirilebiliyor.
 */
export function withMention(content: string, fullName: string): string {
  const token = mentionToken(fullName);
  const trimmed = content.trimStart();
  if (trimmed.startsWith(token)) return content;
  return trimmed ? `${token} ${trimmed}` : `${token} `;
}

/** Metnin başındaki @mention'ı söker — seçim kaldırıldığında. */
export function withoutMention(content: string, fullName: string): string {
  const token = mentionToken(fullName);
  const trimmed = content.trimStart();
  if (!trimmed.startsWith(token)) return content;
  return trimmed.slice(token.length).trimStart();
}

/* ==========================================================================
   Görüntüleme yardımcıları
   ========================================================================== */

/**
 * Panodaki satırda gösterilen kısa içerik.
 *
 * Eki olup metni olmayan not mümkün (şema kısıtı "ya metin ya ek" diyor);
 * o durumda boş bir satır yerine ekin varlığı yazılıyor.
 *
 * YEDEK ETİKETLER DIŞARIDAN: bu modül saf ve senkron, çeviri asenkron —
 * `lib/appointments.ts` içindeki geçiş kurallarıyla aynı ayrım.
 */
export function notePreview(
  content: string,
  attachmentType: "image" | "file" | null,
  labels: { image: string; file: string },
): string {
  const text = content.trim();
  if (text) return text;
  return attachmentType === "image" ? labels.image : labels.file;
}

/**
 * Notun bağlı olduğu kayda giden adres.
 *
 * İKİSİ BİRDEN doluysa MÜŞTERİ kazanıyor: bir not tipik olarak bir kişiyle
 * ilgili ("Ahmet Bey'in evrakları"), ilan o kişinin bağlamı. Ters sıra,
 * müşteri adına tıklayan kullanıcıyı ilan sayfasına atardı.
 */
export function workNoteHref(note: {
  customer_id: string | null;
  listing_id: string | null;
}): string | null {
  if (note.customer_id) return `/musteriler/${note.customer_id}`;
  if (note.listing_id) return `/ilanlar/${note.listing_id}`;
  return null;
}
