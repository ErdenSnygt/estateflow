import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";

import { getWorkNoteFormOptions, getWorkNotes } from "@/lib/data/work-notes";
import { parseWorkNoteQuery, type WorkNoteFilter } from "@/lib/work-notes";
import { single, type SearchParamsInput } from "@/lib/search-params";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { WorkNoteCard } from "@/components/work-notes/work-note-card";
import { WorkNoteComposer } from "@/components/work-notes/work-note-composer";
import { WorkNoteFilterBar } from "@/components/work-notes/work-note-filter-bar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("workNotes.page");
  return { title: t("title") };
}

type PageProps = { searchParams: Promise<SearchParamsInput> };

/**
 * ============================================================================
 * MESAJLAR — İŞ AKIŞI PANOSU
 * ============================================================================
 * Faz 12'de burası iki panelli bir gelen kutusuydu: solda müşteri konuşmaları,
 * sağda sohbet balonları. Faz 18'de model değişti ve düzen de onunla değişti.
 *
 * -----------------------------------------------------------------------------
 * NEDEN ARTIK İKİ PANEL DEĞİL
 * -----------------------------------------------------------------------------
 * İki panel bir SEÇİM gerektirir: solda bir şey seç, sağda oku. Bu, konuşma
 * başına uzun bir geçmiş olduğunda doğru düzen. İş notlarında öyle bir geçmiş
 * yok — her not kendi başına okunabilen, birkaç satırlık bir kayıt. Onları
 * seçtirmek, kullanıcıyı iki tıklama uzağa koymak olurdu.
 *
 * Bunun yerine TEK AKIŞ: filtre üstte, notlar altta, her not kendi eylemleriyle
 * birlikte. `/satislar/teklifler` ile aynı desen.
 *
 * -----------------------------------------------------------------------------
 * SEÇİLİ SEKME VE VURGULANAN NOT URL'DE
 * -----------------------------------------------------------------------------
 * `?f=` sekme, `?t=` tür, `?q=` arama, `?n=` bildirimden gelen vurgu. Hepsi
 * URL'de çünkü bağlantı paylaşılabilir olmalı: bir bildirime tıklayan kullanıcı
 * doğrudan o notun bulunduğu görünüme düşüyor (`lib/notifications.ts`).
 *
 * Menüdeki ad "Mesajlar" olarak KALDI ve adres de `/mesajlar`. İkisi de
 * bilinçli: kullanıcının menüde aradığı yer orası, ve kaydedilmiş bağlantılar
 * kırılmasın. İçeriğin ne olduğunu sayfa başlığı anlatıyor.
 */
export default async function MesajlarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = parseWorkNoteQuery(params);
  const highlightId = single(params, "n");

  /* İkisi birbirinden bağımsız — paralel. Form seçenekleri filtreden
     etkilenmiyor: hangi görünümde olursak olalım not yazılabilmeli. */
  const [notes, options, t, tCommon] = await Promise.all([
    getWorkNotes(query),
    getWorkNoteFormOptions(),
    getTranslations("workNotes"),
    getTranslations("common"),
  ]);

  /* Göreli zamanların ölçüldüğü an TEK YERDE ve sunucuda. İstemci
     bileşenlerinin kendi `Date.now()`unu çağırması hydration uyuşmazlığı
     üretirdi — gerekçe `lib/format.ts` içinde. */
  const reference = Date.now();

  const hasNarrowing = Boolean(query.type || query.search);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      <WorkNoteComposer options={options} />

      <WorkNoteFilterBar active={query.filter} />

      {notes.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          badge={tCommon("empty")}
          title={t(emptyKey(query.filter, hasNarrowing, "Title"))}
          description={t(emptyKey(query.filter, hasNarrowing, "Body"))}
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <WorkNoteCard
              key={note.id}
              note={note}
              options={options}
              reference={reference}
              highlighted={note.id === highlightId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Boş durumlar
   ========================================================================== */

/**
 * Sekme başına AYRI METİN. "Kayıt bulunamadı" demek üç farklı durumu tek
 * cümleye sıkıştırırdı: hiç not olmaması, açık iş kalmaması ve filtrenin çok
 * dar olması birbirinden farklı şeyler — ilki bir başlangıç, ikincisi bir
 * başarı, üçüncüsü bir düzeltme daveti.
 *
 * Fonksiyon artık METİN DEĞİL ANAHTAR üretiyor; cümleler sözlükte
 * (`workNotes.empty.*`). Dönüş tipi ŞABLON BİRLİĞİ: `filter` zaten dört
 * değerden biri, yani üretilen anahtar da sekiz olasılıktan biri ve `t()`
 * çağrısı derleme zamanında denetleniyor. Düz `string` olsaydı yanlış bir
 * anahtar sessizce ekrana düşerdi.
 */
function emptyKey(
  filter: WorkNoteFilter,
  narrowed: boolean,
  part: "Title" | "Body",
): `empty.narrowed${typeof part}` | `empty.${WorkNoteFilter}${typeof part}` {
  if (narrowed) return `empty.narrowed${part}`;
  return `empty.${filter}${part}`;
}
