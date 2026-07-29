import type { Metadata } from "next";
import { FileText } from "lucide-react";

import {
  getDocumentFilterOptions,
  getDocumentSummary,
  getDocuments,
} from "@/lib/data/documents";
import { parseDocumentFilters } from "@/lib/documents-filters";
import { DOCUMENT_TYPE_LABELS } from "@/lib/messaging";
import { formatBytes } from "@/lib/storage/paths";
import type { SearchParamsInput } from "@/lib/search-params";
import type { DocumentType } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentDropzone } from "@/components/documents/document-dropzone";
import { DocumentFilterBar } from "@/components/documents/document-filter-bar";
import { DocumentRow } from "@/components/documents/document-row";

export const metadata: Metadata = {
  title: "Evraklar",
};

type PageProps = { searchParams: Promise<SearchParamsInput> };

/**
 * Evrak arşivi.
 *
 * Belgeler PRIVATE bir bucket'ta ve bu sayfa hiçbir kalıcı dosya adresi
 * taşımıyor: satırlar yalnızca üstveri gösteriyor, indirme bağlantısı
 * tıklandığı an üretiliyor (`DocumentRow`). Gerekçe README'de.
 */
export default async function EvraklarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseDocumentFilters(params);

  /* Üçü de birbirinden bağımsız — paralel. Özet filtreden ETKİLENMİYOR:
     "toplam kaç belge var" sorusu filtrelenmiş listeye göre değişseydi
     kullanıcı arşivin büyüklüğünü hiç göremezdi. */
  const [documents, summary, options] = await Promise.all([
    getDocuments(filters),
    getDocumentSummary(),
    getDocumentFilterOptions(),
  ]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title="Evraklar"
        description="Tapu, kimlik ve sözleşme belgeleri. Dosyalar korumalı alanda saklanır, indirme bağlantıları kişiye özel üretilir."
      />

      {/* --- Özet --- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryTile
          label="Toplam belge"
          value={String(summary.total)}
          hint={formatBytes(summary.totalBytes)}
          emphasis
        />
        {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => (
          <SummaryTile
            key={type}
            label={DOCUMENT_TYPE_LABELS[type]}
            value={String(summary.byType[type])}
            hint="belge"
          />
        ))}
      </div>

      <DocumentDropzone
        customerOptions={options.customers}
        listingOptions={options.listings}
      />

      <DocumentFilterBar
        customerOptions={options.customers}
        listingOptions={options.listings}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          badge="Boş"
          title={hasFilters ? "Bu filtreye uyan belge yok" : "Henüz belge yok"}
          description={
            hasFilters
              ? "Filtreleri temizleyip tekrar deneyin."
              : "Yukarıdaki alana bir dosya sürükleyerek ilk belgenizi yükleyin. Belgeyi bir müşteri ya da ilanla ilişkilendirirseniz onların detay sayfasında da görünür."
          }
        />
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-0.5 p-4">
        <p className="text-[12px] text-muted-foreground">{label}</p>
        <p
          className={
            emphasis
              ? "text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-foreground"
              : "text-[18px] font-semibold tabular-nums text-foreground"
          }
        >
          {value}
        </p>
        <p className="text-[11.5px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
