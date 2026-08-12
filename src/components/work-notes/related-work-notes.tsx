import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { WorkNoteFormOptions, WorkNoteThread } from "@/lib/data/work-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkNoteCard } from "@/components/work-notes/work-note-card";
import { WorkNoteComposer } from "@/components/work-notes/work-note-composer";

/**
 * ============================================================================
 * MÜŞTERİ / İLAN DETAYINDAKİ "İŞ NOTLARI"
 * ============================================================================
 * `/mesajlar` panosuyla AYNI VERİ, farklı bağlam — Faz 18'in ana fikri bu.
 * Notlar panoda "hangi işler açık" sorusunu, burada "bu kayıtla ilgili ne
 * konuşulmuş" sorusunu yanıtlıyor.
 *
 * -----------------------------------------------------------------------------
 * `RelatedDocuments` İLE FARKI: BURASI YAZILABİLİR
 * -----------------------------------------------------------------------------
 * Evrak kartı yalnızca özet gösteriyor ve yüklemek için `/evraklar`a
 * gönderiyor; gerekçesi o dosyada yazılı (imzalı URL üretimi istemci bileşeni
 * gerektiriyor, detay sayfasına yük bindiriyordu).
 *
 * Burada tersi tercih edildi ve sebebi davranışsal: bir not, kaydı OKURKEN
 * aklına gelen şeydir. "Ahmet Bey fiyat konusunda esnek değil" notunu yazmak
 * için başka bir sayfaya gitmek, notun hiç yazılmaması demek. Bedeli, detay
 * sayfasına bir istemci bileşeni daha eklemek — ve bu bedel `/mesajlar` ile
 * paylaşıldığı için (aynı bileşenler) ayrı bir bundle maliyeti getirmiyor.
 *
 * Bağlam SABİT geçiliyor (`fixedCustomerId` / `fixedListingId`): zaten o
 * kaydın içindeyiz, hangi müşteriyi kastettiğimizi sormak gereksiz bir adım.
 */
export async function RelatedWorkNotes({
  notes,
  options,
  reference,
  customerId,
  listingId,
}: {
  notes: WorkNoteThread[];
  options: WorkNoteFormOptions;
  reference: number;
  customerId?: string;
  listingId?: string;
}) {
  const t = await getTranslations("workNotes.section");
  const openCount = notes.filter((note) => note.status === "open").length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>{t("title")}</CardTitle>
          {/* Açık iş sayısı BAŞLIKTA: kartı kapalı geçen kullanıcı bile
              bekleyen bir şey olduğunu görsün. Sıfırsa rozet hiç çizilmiyor —
              "0 açık" bilgi vermeyen görsel gürültü. */}
          {openCount > 0 && (
            <Badge variant="warning">
              {t("openBadge", { count: openCount })}
            </Badge>
          )}
        </div>

        {notes.length > 0 && (
          <Link
            href="/mesajlar?f=all"
            className="text-[12.5px] font-medium text-brand transition-colors hover:text-brand-strong"
          >
            {t("all")}
          </Link>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-3">
        <WorkNoteComposer
          options={options}
          fixedCustomerId={customerId}
          fixedListingId={listingId}
          compact
        />

        {notes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <WorkNoteCard
                key={note.id}
                note={note}
                options={options}
                reference={reference}
                /* Bağlam rozeti gizli: zaten o kaydın sayfasındayız. */
                showContext={false}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
