import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { DocumentItem } from "@/lib/data/documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentDropzone } from "@/components/documents/document-dropzone";
import { DocumentRow } from "@/components/documents/document-row";

/**
 * ============================================================================
 * MÜŞTERİ / İLAN DETAYINDAKİ "EVRAKLAR"
 * ============================================================================
 * Faz 18'de bu kart DEĞİŞTİ. Önceki hâli (`RelatedDocuments`) yalnızca bir
 * özetti: başlık, tarih ve boyut gösteriyor, indirme ve yükleme için
 * `/evraklar` sayfasına yolluyordu. Gerekçesi bundle'dı — indirme imzalı URL
 * gerektiriyor, o da istemci bileşeni demek.
 *
 * O gerekçe geçerliliğini yitirdi: aynı fazda detay sayfalarına iş notları
 * geldi ve onlar zaten istemci bileşeni. Evrak satırını da eklemenin ek
 * maliyeti, halihazırda yüklenen paylaşılan parçalar üzerinden ödendi.
 *
 * Karşılığında kazanılan şey büyük: bir tapuyu MÜŞTERİNİN SAYFASINDA yükleyip
 * indirebilmek. Evrakların gerçekte aranma biçimi bu — "hangi belgeler var"
 * değil, "Ahmet Bey'in tapusu nerede". `/evraklar` sayfasının Faz 18'de müşteri
 * arama odaklı hâle gelmesi de aynı gözlemden çıktı.
 */
export async function DocumentSection({
  documents,
  customerId,
  listingId,
  customerOptions,
  listingOptions,
}: {
  documents: DocumentItem[];
  customerId?: string;
  listingId?: string;
  /* Bağlam sabit olduğu için bu listeler boş geçilebiliyor; `DocumentDropzone`
     ilgili açılırı zaten çizmiyor. Yine de imza korunuyor: ileride "ayrıca bir
     ilanla da ilişkilendir" istenirse tek satırlık bir değişiklik. */
  customerOptions?: { id: string; label: string }[];
  listingOptions?: { id: string; label: string }[];
}) {
  const t = await getTranslations("documents.section");

  const filterHref = customerId
    ? `/evraklar?customer=${customerId}`
    : `/evraklar?listing=${listingId}`;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{t("title")}</CardTitle>
        {documents.length > 0 && (
          <Link
            href={filterHref}
            className="text-[12.5px] font-medium text-brand transition-colors hover:text-brand-strong"
          >
            {t("archive")}
          </Link>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-3">
        <DocumentDropzone
          customerOptions={customerOptions ?? []}
          listingOptions={listingOptions ?? []}
          fixedCustomerId={customerId}
          fixedListingId={listingId}
        />

        {documents.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
